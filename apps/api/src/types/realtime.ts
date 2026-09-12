import type { TaskStatus } from "../../generated/prisma/client";

export interface TaskStatusChangedEvent {
  eventId: string;
  type: "TASK_STATUS_CHANGED";
  projectId: string;
  taskId: string;
  actorId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  createdAt: string;
}

export interface NotificationCreatedEvent {
  eventId: string;
  type: "NOTIFICATION_CREATED";
  notificationType: "TASK_ASSIGNED" | "TASK_IN_REVIEW";
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  projectId?: string;
  taskId?: string;
  createdAt: string;
}