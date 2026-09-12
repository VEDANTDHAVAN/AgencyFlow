import { Router } from "express";
import {
  create, getTaskById,
  listTasks, update,
  updateStatus,
} from "../controllers/task.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRoles } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate);

router.get("/", listTasks);

router.get("/:id", getTaskById);

router.post(
  "/",
  requireRoles("ADMIN", "PROJECT_MANAGER"),
  create,
);

router.patch("/:id", update);

router.patch("/:id/status", updateStatus);

export default router;