import { runPowerShell } from "../shell.js";
import { registerTool } from "./registry.js";

// Read-only PowerShell. Every command is checked against an allowlist before it
// runs: only inspection cmdlets and a few read-only developer commands, joined
// by pipes. Anything that could change the system, run arbitrary script, or
// reach outside the target is refused. Anything else goes through
// run_command, which asks the user to allow or decline it.

// Cmdlets that only read state.
const READ_ONLY_CMDLETS = new Set(
  [
    // files (paths are restricted to the target, see checkPathToken)
    "Get-ChildItem", "Get-Content", "Get-Item", "Get-ItemProperty", "Get-Acl", "Get-FileHash",
    "Test-Path", "Select-String", "Get-Location",
    // system / hardening inspection
    "Get-Process", "Get-Service", "Get-NetTCPConnection", "Get-NetUDPEndpoint",
    "Get-NetFirewallProfile", "Get-NetFirewallRule", "Get-MpComputerStatus", "Get-MpPreference",
    "Get-HotFix", "Get-LocalUser", "Get-LocalGroup", "Get-LocalGroupMember", "Get-ScheduledTask",
    "Get-CimInstance", "Get-ComputerInfo", "Get-ExecutionPolicy", "Get-BitLockerVolume",
    "Get-Command", "Get-Date",
    // pipeline shaping
    "Select-Object", "Where-Object", "Sort-Object", "Measure-Object", "Group-Object",
    "Format-Table", "Format-List", "Out-String", "ConvertTo-Json",
  ].map((c) => c.toLowerCase()),
);

// Characters that enable script blocks, subexpressions, method calls,
// variables, redirection or command chaining. Only plain cmdlet pipelines pass.
const FORBIDDEN = /[;&<>`$(){}\[\]@\r\n]|\|\|/;

// PowerShell drives that would expose secrets or allow code definition.
const FORBIDDEN_DRIVES = /^(env|variable|function|alias|wsman):/i;
const ALLOWED_ABSOLUTE = /^(hklm|hkcu|cert):/i;

const tokenize = (segment) =>
  (segment.match(/'[^']*'|"[^"]*"|\S+/g) || []).map((t) => t.replace(/^['"]|['"]$/g, ""));

// Parameters that would reach another machine instead of this one.
const REMOTE_PARAMS = /^-(computername|cimsession|session|credential)\b/i;

const checkPathToken = (raw, computerTarget) => {
  if (REMOTE_PARAMS.test(raw)) return "Remote-machine parameters are not allowed.";
  // `-Path:C:\x` binds the value inline; check the value part.
  const tok = /^-[a-z]+:/i.test(raw) ? raw.slice(raw.indexOf(":") + 1) : raw;
  if (!tok) return null;
  if (FORBIDDEN_DRIVES.test(tok)) return `"${tok}" is not allowed (it could expose secrets).`;
  if (ALLOWED_ABSOLUTE.test(tok)) return null;
  if (computerTarget) {
    if (/^[\\/]{2}/.test(tok)) return "Network and device paths are not allowed for This PC.";
    if (process.platform === "win32" ? /^[a-z]:[\\/]/i.test(tok) : tok.startsWith("/")) return null;
    return null;
  }
  if (/^[a-z]:/i.test(tok) || /^[\\/]{2}/.test(tok) || /^~/.test(tok) || /(^|[\\/])\.\.([\\/]|$)/.test(tok)) {
    return `"${tok}" points outside the authorized target. Use paths relative to the target.`;
  }
  return null;
};

const GIT_SUBCOMMANDS = new Set(["status", "log", "diff", "show", "ls-files", "rev-parse", "blame", "branch", "remote", "shortlog", "tag"]);
const GIT_BRANCH_FLAGS = new Set(["-a", "-r", "-v", "-vv", "--list", "--show-current", "--all", "--remotes"]);

const checkNative = (tokens) => {
  const [cmd, sub, ...rest] = tokens.map((t) => t.toLowerCase());
  if (cmd === "node") return ["--version", "-v"].includes(sub) && !rest.length ? null : "Only `node --version` is allowed.";
  if (cmd === "npm") {
    if (["--version", "-v"].includes(sub) && !rest.length) return null;
    if (!["ls", "list", "audit", "outdated"].includes(sub)) return "Only `npm ls`, `npm audit` and `npm outdated` are allowed.";
    if (rest.includes("fix") || rest.some((t) => t.startsWith("--force"))) return "`npm audit fix` changes the project and needs approval.";
    return null;
  }
  if (cmd === "git") {
    if (!GIT_SUBCOMMANDS.has(sub)) return `git ${sub || ""} is not a read-only command.`;
    if (rest.some((t) => t.startsWith("--output") || t === "--ext-diff" || t.startsWith("--exec"))) {
      return "That git option can write files or run programs.";
    }
    if (sub === "branch" && rest.some((t) => !GIT_BRANCH_FLAGS.has(t))) return "Only listing branches is allowed.";
    if (sub === "remote" && rest.some((t) => t !== "-v")) return "Only `git remote -v` is allowed.";
    if (sub === "tag" && rest.some((t) => t !== "-l" && t !== "--list")) return "Only listing tags is allowed.";
    return null;
  }
  return undefined; // not a native command we know
};

// Returns { ok, reason, command } — `command` is the string to execute.
export const validateReadOnlyCommand = (input, { computerTarget = false } = {}) => {
  if (typeof input !== "string" || !input.trim()) return { ok: false, reason: "Empty command." };
  const command = input.trim();
  if (command.length > 500) return { ok: false, reason: "Command is too long." };
  if (FORBIDDEN.test(command)) {
    return {
      ok: false,
      reason:
        "Only plain read-only pipelines are allowed: no ; & > < ` $ ( ) { } [ ] @ or line breaks.",
    };
  }

  const segments = command.split("|").map((s) => s.trim());
  const rewritten = [];
  for (const [i, segment] of segments.entries()) {
    const tokens = tokenize(segment);
    if (!tokens.length) return { ok: false, reason: "Empty pipeline segment." };
    const name = tokens[0].toLowerCase();

    const native = checkNative(tokens);
    if (native !== undefined) {
      if (native) return { ok: false, reason: native };
      if (i > 0) return { ok: false, reason: "Native commands must start the pipeline." };
      // Neutralize repo-controlled git config that can execute programs, and
      // use npm.cmd since the Restricted policy can't load npm.ps1.
      rewritten.push(
        name === "git"
          ? segment.replace(/^git\b/i, "git -c core.fsmonitor=false -c core.pager=cat -c diff.external=")
          : segment.replace(/^npm\b/i, "npm.cmd"),
      );
      continue;
    }

    if (!READ_ONLY_CMDLETS.has(name)) {
      return { ok: false, reason: `"${tokens[0]}" is not on the read-only allowlist.` };
    }
    for (const tok of tokens.slice(1)) {
      const problem = checkPathToken(tok, computerTarget);
      if (problem) return { ok: false, reason: problem };
    }
    rewritten.push(segment);
  }
  return { ok: true, command: rewritten.join(" | ") };
};

registerTool({
  name: "run_powershell_readonly",
  category: "computer",
  description:
    "Run a READ-ONLY PowerShell pipeline in the target folder to inspect the project or the system's security posture " +
    "(e.g. Get-NetFirewallProfile, Get-MpComputerStatus, Get-Service, Get-NetTCPConnection, git status/log/diff, npm audit). " +
    "Only allowlisted Get-/Test-/Select-/Where-/Sort-/Format- cmdlets and read-only git/npm/node commands are permitted, " +
    "with no variables, script blocks, parentheses or redirection. Use relative paths.",
  scope: "execute_powershell",
  targetTypes: ["local", "computer"],
  mutating: false,
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "The read-only PowerShell pipeline to run." },
    },
    required: ["command"],
  },
  run: async ({ command }, ctx) => {
    const check = validateReadOnlyCommand(command, { computerTarget: ctx.target.type === "computer" });
    if (!check.ok) throw new Error(`Command refused: ${check.reason}`);
    return runPowerShell(check.command, { cwd: ctx.root, signal: ctx.signal });
  },
});
