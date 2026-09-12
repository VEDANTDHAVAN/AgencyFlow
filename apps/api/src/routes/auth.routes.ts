import { Router } from "express";
import { login, logout, me, refresh } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", login);
router.get("/me", authenticate, me);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;