import type { Server } from "socket.io";
import type { NotificationCreatedEvent } from "../types/realtime";

export function emitNotification(
  io: Server,
  notification: {
    id: string;
    userId: string;
    type: "TASK_ASSIGNED" | "TASK_IN_REVIEW";
    title: string;
    message: string;
    projectId: string | null;
    taskId: string | null;
    createdAt: Date;
  },
  unreadCount: number,
) {
  const event: NotificationCreatedEvent = {
    eventId: notification.id,
    type: "NOTIFICATION_CREATED",
    notificationType: notification.type,
    notificationId: notification.id,
    userId: notification.userId,
    title: notification.title,
    message: notification.message,
    projectId: notification.projectId ?? undefined,
    taskId: notification.taskId ?? undefined,
    createdAt: notification.createdAt.toISOString(),
  };

  const room = `user:${notification.userId}`;

  io.to(room).emit("notification:new", event);

  io.to(room).emit("notification:unread-count", {
    count: unreadCount,
  });
}