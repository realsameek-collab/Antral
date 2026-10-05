import { Router } from "express";
import { sendCode, verifyCode } from "../controllers/auth.controller.js";
import { getProfile, saveProfile } from "../controllers/profile.controller.js";
import { endSession, requireSession, startSession } from "../controllers/session.controller.js";

const router = Router();

router.post("/email/send-code", sendCode);
router.post("/email/verify-code", verifyCode);
router.post("/session", startSession);
router.delete("/session", endSession);
router.get("/profile", requireSession, getProfile);
router.put("/profile", requireSession, saveProfile);

export default router;
