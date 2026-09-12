import { Router } from "express";
import {
  create,
  getProjectById,
  listProjects,
  update,
} from "../controllers/project.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireRoles } from "../middleware/role.middleware";
import { authorizeProject } from "../middleware/authorize";

const router = Router();

router.use(authenticate);

router.get("/", listProjects);

router.get(
  "/:id",
  authorizeProject(),
  getProjectById,
);

router.post(
  "/",
  requireRoles("ADMIN", "PROJECT_MANAGER"),
  create,
);

router.patch(
  "/:id",
  authorizeProject(),
  update,
);

export default router;