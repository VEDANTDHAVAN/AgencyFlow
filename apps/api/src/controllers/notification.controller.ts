import type { Request, Response } from "express";
import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification.service";

export async function listNotifications(
  req: Request,
  res: Response,
) {
  const rawLimit = req.query.limit;

  const limit =
    rawLimit === undefined
      ? 20
      : Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      error: {
        code: "INVALID_LIMIT",
        message: "Limit must be an integer between 1 and 100",
      },
    });
  }

  const notifications = await getUserNotifications(
    req.user!,
    limit,
  );

  return res.status(200).json({
    notifications,
  });
}

export async function getUnreadCount(
  req: Request,
  res: Response,
) {
  const count = await getUnreadNotificationCount(
    req.user!,
  );

  return res.status(200).json({
    count,
  });
}

export async function markAsRead(
  req: Request,
  res: Response,
) {
  const notificationId = req.params.id;

  if (typeof notificationId !== "string") {
    return res.status(400).json({
      error: {
        code: "INVALID_NOTIFICATION_ID",
        message: "Invalid notification ID",
      },
    });
  }

  try {
    const notification = await markNotificationRead(
      req.user!,
      notificationId,
    );

    return res.status(200).json({
      notification,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "NOTIFICATION_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: "Notification not found",
        },
      });
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You cannot modify this notification",
        },
      });
    }

    throw error;
  }
}

export async function markAllAsRead(
  req: Request,
  res: Response,
) {
  const result = await markAllNotificationsRead(
    req.user!,
  );

  return res.status(200).json({
    updatedCount: result.count,
  });
}