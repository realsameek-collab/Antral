import { AccountConsent, TargetAuthorization } from "../../models/consent.model.js";
import { missingAccountDocuments } from "../../middleware/requireConsent.js";
import { getTool } from "./tools/index.js";
import { redactSecrets } from "./redact.js";
import { requestApproval } from "./approvals.js";

const MAX_RESULT_CHARS = 30_000;

// Re-checks consent at the moment of each tool call — not just when the run
// started — so revoking a target, withdrawing consent or flipping a
// kill-switch stops a run that is already in progress.
// Returns { denial } or { auth }.
const checkPermission = async ({ userUid, authorizationId, scope }) => {
  const [consent, auth] = await Promise.all([
    AccountConsent.findOne({ userUid }),
    TargetAuthorization.findById(authorizationId),
  ]);
  if (missingAccountDocuments(consent).length) return { denial: "Account consent is no longer active." };
  if (!auth || auth.userUid !== userUid || !auth.isCurrentlyValid()) {
    return { denial: "The target authorization was revoked or has expired." };
  }
  if (scope === null) return { auth }; // touches no system resource
  if (!auth.scopes.includes(scope)) return { denial: `Permission "${scope}" is not granted for this target.` };
  if ((consent.disabledCapabilities || []).includes(scope)) return { denial: `Capability "${scope}" is turned off.` };
  return { auth };
};

const DECLINE_MESSAGES = {
  decline:
    "The user declined this action. Do not retry it. Continue another way, or explain what you would have done and why.",
  expired: "No answer from the user within 30 minutes, so this action was declined. Do not retry it.",
  cancelled: "The run was cancelled.",
};

// Runs one tool call requested by the model. Never throws: failures are
// returned as text so the model can see what went wrong and adjust.
// Returns { ok, denied, content, durationMs }.
export const executeToolCall = async ({ name, args, run, ctx }) => {
  const started = Date.now();
  const tool = getTool(name);
  const elapsed = () => Date.now() - started;

  if (!tool || !run.toolsOffered.includes(name)) {
    return { ok: false, denied: true, content: `Tool "${name}" is not available in this run.`, durationMs: 0 };
  }

  const permission = { userUid: run.userUid, authorizationId: run.authorizationId, scope: tool.scope };
  let { denial, auth } = await checkPermission(permission);
  if (denial) return { ok: false, denied: true, content: `Denied: ${denial}`, durationMs: elapsed() };

  // Changes need the user's say-so: an always-allow rule, or an answer now.
  if (tool.mutating) {
    const rule = tool.ruleFor ? tool.ruleFor(args) : null;
    if (!(rule && auth.alwaysAllow.includes(rule))) {
      const decision = await requestApproval({
        run,
        tool: name,
        args,
        summary: tool.describe ? tool.describe(args) : name,
        rule,
        signal: ctx.signal,
      });
      if (decision !== "allow_once" && decision !== "allow_always") {
        return { ok: false, denied: true, content: DECLINE_MESSAGES[decision], durationMs: elapsed() };
      }
      // Permissions may have changed while the run was waiting.
      ({ denial } = await checkPermission(permission));
      if (denial) return { ok: false, denied: true, content: `Denied: ${denial}`, durationMs: elapsed() };
    }
  }

  try {
    const result = await tool.run(args || {}, ctx);
    const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    const clipped = text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}\n… truncated` : text;
    return { ok: true, denied: false, content: redactSecrets(clipped), durationMs: elapsed() };
  } catch (error) {
    return { ok: false, denied: false, content: redactSecrets(`Error: ${error.message}`), durationMs: elapsed() };
  }
};
