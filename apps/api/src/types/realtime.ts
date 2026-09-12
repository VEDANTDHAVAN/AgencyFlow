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