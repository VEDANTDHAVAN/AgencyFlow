import type { AuthUser } from "../types/auth";
import {
  countUnreadNotifications,
  createNotification,
  findNotificationById,
  findNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../repositories/notification.repository";

export async function getUserNotifications(
  user: AuthUser,
  limit = 20,
) {
  return findNotifications(
    user.id,
    Math.min(Math.max(limit, 1), 100),
  );
}

export async function getUnreadNotificationCount(
  userId: string,
) {
  return countUnreadNotifications(userId);
}

export async function markNotificationRead(
  user: AuthUser,
  notificationId: string,
) {
  const notification = await findNotificationById(notificationId);

  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }

  if (notification.userId !== user.id) {
    throw new Error("FORBIDDEN");
  }

  if (notification.readAt) {
    return notification;
  }

  return markNotificationAsRead(notificationId);
}

export async function markAllNotificationsRead(
  user: AuthUser,
) {
  return markAllNotificationsAsRead(user.id);
}

export async function createUserNotification(data: {
  userId: string;
  type: "TASK_ASSIGNED" | "TASK_IN_REVIEW";
  title: string;
  message: string;
  projectId?: string;
  taskId?: string;
}) {
  return createNotification(data);
}