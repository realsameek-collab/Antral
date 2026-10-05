import { Router } from "express";
import { attachUser } from "../middleware/attachUser.js";
import {
  requireAccountConsent,
  requireTargetAuthorization,
} from "../middleware/requireConsent.js";
import {
  getPolicies,
  getConsentStatus,
  acceptAccountPolicies,
  withdrawAccountConsent,
  authorizeTarget,
  updateTargetScopes,
  revokeTargetAuthorization,
  setDisabledCapabilities,
} from "../controllers/consent.controller.js";

const router = Router();

// Everything here requires a signed-in user.
router.use(attachUser);

// Policy documents + the user's current consent state.
router.get("/consent/policies", getPolicies);
router.get("/consent/status", getConsentStatus);

// Account-level consent (the one-time gate).
router.post("/consent/account", acceptAccountPolicies);
router.delete("/consent/account", withdrawAccountConsent);

// Per-target authorization.
router.post("/consent/target", requireAccountConsent, authorizeTarget);
router.patch("/consent/target/:id", requireAccountConsent, updateTargetScopes);
router.delete("/consent/target/:id", revokeTargetAuthorization);

// Global kill-switches: turn any capability off (or back on) at any time.
router.put("/consent/capabilities", setDisabledCapabilities);

// --- Demonstration: a gated agent action ---------------------------------
// Proves the enforcement path end-to-end. A real scan endpoint would sit
// behind exactly this chain: signed in -> account consent -> target
// authorized with the scopes this action needs.
router.post(
  "/scan/preflight",
  requireAccountConsent,
  requireTargetAuthorization(["read_source"]),
  (req, res) => {
    res.json({
      message: "Authorized. The agent team may proceed on this target.",
      target: req.target,
      grantedScopes: req.authorization.scopes,
    });
  },
);

export default router;
