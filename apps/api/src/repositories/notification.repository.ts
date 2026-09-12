import { prisma } from "../config/prisma";

export async function findNotifications(
  userId: string,
  limit = 20,
) {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function findNotificationById(
  notificationId: string,
) {
  return prisma.notification.findUnique({
    where: {
      id: notificationId,
    },
  });
}

export async function markNotificationAsRead(
  notificationId: string,
) {
  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function markAllNotificationsAsRead(
  userId: string,
) {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function createNotification(data: {
  userId: string;
  type: "TASK_ASSIGNED" | "TASK_IN_REVIEW";
  title: string;
  message: string;
  projectId?: string;
  taskId?: string;
}) {
  return prisma.notification.create({
    data,
  });
}