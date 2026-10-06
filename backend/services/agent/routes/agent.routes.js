import { Router } from "express";
import { attachUser } from "../middleware/attachUser.js";
import {
  requireAccountConsent,
  requireTargetAuthorization,
} from "../middleware/requireConsent.js";
import {
  getTools,
  createRun,
  listRuns,
  getRun,
  cancelRunHandler,
  listPendingApprovals,
  answerApproval,
  getAlwaysAllow,
  removeAlwaysAllow,
  listConversationsHandler,
  getConversationHandler,
  deleteConversationHandler,
  getLimits,
  deleteProjectHandler,
} from "../controllers/agent.controller.js";

const router = Router();

router.use(attachUser);

router.get("/tools", getTools);
router.get("/limits", getLimits);

// Conversation memory (Redis). POST /runs with a conversationId continues one.
router.get("/conversations", listConversationsHandler);
router.get("/conversations/:id", getConversationHandler);
router.delete("/conversations/:id", deleteConversationHandler);

// Starting a run needs account consent and a current authorization for the
// target. Per-tool scopes are then enforced by the executor on every call.
router.post("/runs", requireAccountConsent, requireTargetAuthorization([]), createRun);
router.get("/runs", listRuns);
router.get("/runs/:id", getRun);
router.post("/runs/:id/cancel", cancelRunHandler);

// Runs work in the background. When one wants to change something it pauses
// and appears here until the user answers Allow once / Always allow / Decline.
router.get("/approvals", listPendingApprovals);
router.post("/runs/:id/approval", answerApproval);

// Projects (authorized targets) and their chats.
router.delete("/projects/:id", deleteProjectHandler);

// "Always allow" rules saved per target, so the user can review and remove them.
router.get("/targets/:id/always-allow", getAlwaysAllow);
router.delete("/targets/:id/always-allow", removeAlwaysAllow);

export default router;
