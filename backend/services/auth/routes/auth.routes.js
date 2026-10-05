import { Router } from "express";
import { sendCode, verifyCode } from "../controllers/auth.controller.js";
import { getProfile, saveProfile } from "../controllers/profile.controller.js";

const router = Router();

router.post("/email/send-code", sendCode);
router.post("/email/verify-code", verifyCode);
router.get("/profile", getProfile);
router.put("/profile", saveProfile);

export default router;
