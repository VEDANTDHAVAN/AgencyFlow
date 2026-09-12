import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
} from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;