import type { Request, Response } from "express";
import {
  createNewTask, getAllTasks,
  getTask, updateExistingTask,
  updateTaskStatus,
} from "../services/task.service";
import {
  createTaskSchema, updateTaskSchema,
  updateTaskStatusSchema,
} from "../schemas/task.schema";
import { getUnreadNotificationCount, createUserNotification } from "../services/notification.service";
import { emitNotification } from "../websocket/notification-events";

export async function listTasks(
  req: Request, res: Response,
) {
  try {
    const tasks = await getAllTasks(req.user!);

    return res.json({
      data: tasks,
    });
  } catch {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch tasks",
      },
    });
  }
}

export async function getTaskById(
  req: Request, res: Response,
) {
  const taskId = req.params.id;

  if (typeof taskId !== "string") {
    return res.status(400).json({
      error: {
        code: "INVALID_TASK_ID",
        message: "Invalid task ID",
      },
    });
  }

  try {
    const task = await getTask(
      req.user!, taskId,
    );

    return res.json({
      data: task,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "TASK_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: {
          code: "TASK_NOT_FOUND",
          message: "Task not found",
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
          message: "You do not have access to this task",
        },
      });
    }

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch task",
      },
    });
  }
}

export async function create(
  req: Request, res: Response,
) {
  const parsed = createTaskSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid task data",
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    const result = await createNewTask(
      req.user!,
      parsed.data,
    );

    const io = req.app.get("io");

    if(result.notification) {
      const unreadCount = await getUnreadNotificationCount(req.user!.id);

      emitNotification(
        io, result.notification, unreadCount,
      );
    }

    return res.status(201).json({
      data: result,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You cannot create a task in this project",
        },
      });
    }

    if (
      error instanceof Error &&
      error.message === "PROJECT_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    if (
      error instanceof Error &&
      error.message === "DEVELOPER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: {
          code: "DEVELOPER_NOT_FOUND",
          message: "Developer not found",
        },
      });
    }

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create task",
      },
    });
  }
}

export async function update(
  req: Request, res: Response,
) {
  const taskId = req.params.id;

  if (typeof taskId !== "string") {
    return res.status(400).json({
      error: {
        code: "INVALID_TASK_ID",
        message: "Invalid task ID",
      },
    });
  }

  const parsed = updateTaskSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid task data",
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    const task = await updateExistingTask(
      req.user!,
      taskId,
      parsed.data,
    );

    return res.json({
      data: task,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "TASK_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: {
          code: "TASK_NOT_FOUND",
          message: "Task not found",
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
          message: "You cannot update this task",
        },
      });
    }

    if (
      error instanceof Error &&
      error.message === "DEVELOPER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: {
          code: "DEVELOPER_NOT_FOUND",
          message: "Developer not found",
        },
      });
    }

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update task",
      },
    });
  }
}

export async function updateStatus(
  req: Request, res: Response,
) {
  const taskId = req.params.id;

  if (typeof taskId !== "string") {
    return res.status(400).json({
      error: {
        code: "INVALID_TASK_ID",
        message: "Invalid task ID",
      },
    });
  }

  const parsed = updateTaskStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid task status",
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    const result = await updateTaskStatus(
      req.user!,
      taskId,
      parsed.data,
    );

    const io = req.app.get("io");
    
    const room = `task:${result.activity.taskId}`;

    const taskEvent = {
      eventId: result.activity.id, type: "TASK_STATUS_CHANGED" as const,
      projectId: result.activity.projectId, taskId: result.activity.taskId,
      actorId: result.activity.actorId, previousStatus: result.activity.oldValue,
      newStatus: result.activity.newValue, createdAt: result.activity.createdAt.toISOString(),
    };

    io.to(room).emit("task:status-changed", taskEvent);

    // 2. Emit Notification if one was created
    if (result.notification) {
      const unreadCount = await getUnreadNotificationCount(
      result.notification.userId,
      );

      emitNotification(
        io, result.notification, unreadCount,
      );
    }

    return res.json({
      data: {
        task: result.task,
        history: result.history,
        activity: result.activity,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "TASK_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: {
          code: "TASK_NOT_FOUND",
          message: "Task not found",
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
          message: "You cannot change this task status",
        },
      });
    }

    if (
      error instanceof Error &&
      error.message === "INVALID_STATUS_TRANSITION"
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: "Invalid task status transition",
        },
      });
    }

    if (
      error instanceof Error &&
      error.message === "STATUS_UNCHANGED"
    ) {
      return res.status(400).json({
        error: {
          code: "STATUS_UNCHANGED",
          message: "Task is already in this status",
        },
      });
    }

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update task status",
      },
    });
  }
}