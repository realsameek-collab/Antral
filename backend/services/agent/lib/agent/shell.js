import { spawn } from "node:child_process";

const MAX_OUTPUT_CHARS = 30_000;

// Runs a PowerShell command in `cwd` and resolves with its exit code and
// combined output. Killed on timeout or when `signal` aborts.
export const runPowerShell = (
  command,
  { cwd, signal, timeoutMs = 60_000, executionPolicy = "Restricted" },
) =>
  new Promise((resolve, reject) => {
    if (process.platform !== "win32") {
      reject(new Error("PowerShell is only available on Windows hosts."));
      return;
    }
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", executionPolicy, "-Command", command],
      {
        cwd,
        windowsHide: true,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_PAGER: "cat", NO_COLOR: "1", CI: "1" },
      },
    );
    let out = "";
    let truncated = false;
    const append = (chunk) => {
      if (out.length >= MAX_OUTPUT_CHARS) {
        truncated = true;
        return;
      }
      out += chunk.toString("utf8");
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);

    // /T kills the whole tree (npm, node servers…), not just powershell.exe.
    const kill = () => spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      kill();
    }, timeoutMs);
    const onAbort = () => kill();
    signal?.addEventListener("abort", onAbort, { once: true });

    child.on("error", (e) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      const body = out.slice(0, MAX_OUTPUT_CHARS).trimEnd() || "(no output)";
      const notes = [
        truncated ? "… output truncated" : "",
        timedOut ? `… stopped after ${Math.round(timeoutMs / 1000)}s timeout` : "",
      ].filter(Boolean);
      resolve(`exit code ${code}\n${body}${notes.length ? `\n${notes.join("\n")}` : ""}`);
    });
  });
