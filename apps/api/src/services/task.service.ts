import { prisma } from "../config/prisma";
import type { AuthUser } from "../types/auth";
import {
  changeTaskStatus,
  createTask,
  findTaskById,
  findTasks,
  updateTask,
} from "../repositories/task.repository";
import type {
  CreateTaskInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "../schemas/task.schema";
import { createUserNotification } from "./notification.service";

export async function getAllTasks(user: AuthUser) {
  if (user.role === "ADMIN") {
    return findTasks();
  }

  if (user.role === "PROJECT_MANAGER") {
    return prisma.task.findMany({
      where: {
        project: {
          createdById: user.id,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedDeveloper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  return prisma.task.findMany({
    where: {
      assignedDeveloperId: user.id,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      assignedDeveloper: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getTask(
  user: AuthUser,
  taskId: string,
) {
  const task = await findTaskById(taskId);

  if (!task) {
    throw new Error("TASK_NOT_FOUND");
  }

  if (user.role === "ADMIN") {
    return task;
  }

  if (
    user.role === "PROJECT_MANAGER" &&
    task.project.createdById === user.id
  ) {
    return task;
  }

  if (
    user.role === "DEVELOPER" &&
    task.assignedDeveloper?.id === user.id
  ) {
    return task;
  }

  throw new Error("FORBIDDEN");
}

export async function createNewTask(
  user: AuthUser,
  input: CreateTaskInput,
) {
  if (
    user.role !== "ADMIN" &&
    user.role !== "PROJECT_MANAGER"
  ) {
    throw new Error("FORBIDDEN");
  }

  const project = await prisma.project.findUnique({
    where: {
      id: input.projectId,
    },
    select: {
      id: true,
      createdById: true,
    },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  if (
    user.role === "PROJECT_MANAGER" &&
    project.createdById !== user.id
  ) {
    throw new Error("FORBIDDEN");
  }

  if (input.assignedDeveloperId) {
    const developer = await prisma.user.findFirst({
      where: {
        id: input.assignedDeveloperId,
        role: "DEVELOPER",
      },
      select: {
        id: true,
      },
    });

    if (!developer) {
      throw new Error("DEVELOPER_NOT_FOUND");
    }
  }

  const task = await createTask({
    title: input.title, description: input.description,
    projectId: input.projectId, assignedDeveloperId: input.assignedDeveloperId,
    priority: input.priority, dueDate: input.dueDate,
  });

  let notification = null;

  if (task.assignedDeveloperId) {
    notification = await createUserNotification({
      userId: task.assignedDeveloperId, type: "TASK_ASSIGNED",
      title: "New task assigned", message: `You have been assigned the task "${task.title}".`,
      projectId: task.projectId, taskId: task.id,
    });
  }

  return {
    task, notification,
  };
}

export async function updateExistingTask(
  user: AuthUser,
  taskId: string,
  input: UpdateTaskInput,
) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      project: {
        select: {
          createdById: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("TASK_NOT_FOUND");
  }

  if (user.role === "DEVELOPER") {
    throw new Error("FORBIDDEN");
  }

  if (
    user.role === "PROJECT_MANAGER" &&
    task.project.createdById !== user.id
  ) {
    throw new Error("FORBIDDEN");
  }

  if (input.assignedDeveloperId) {
    const developer = await prisma.user.findFirst({
      where: {
        id: input.assignedDeveloperId,
        role: "DEVELOPER",
      },
      select: {
        id: true,
      },
    });

    if (!developer) {
      throw new Error("DEVELOPER_NOT_FOUND");
    }
  }

  return updateTask(taskId, input);
}

const allowedTransitions: Record<
  string,
  string[]
> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["IN_REVIEW", "TODO"],
  IN_REVIEW: ["DONE", "IN_PROGRESS"],
  DONE: [],
};

export async function updateTaskStatus(
  user: AuthUser,
  taskId: string,
  input: UpdateTaskStatusInput,
) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      status: true,
      projectId: true,
      project: {
        select: {
          createdById: true,
        },
      },
      assignedDeveloperId: true,
    },
  });

  if (!task) {
    throw new Error("TASK_NOT_FOUND");
  }

  if (user.role === "DEVELOPER") {
    if (task.assignedDeveloperId !== user.id) {
      throw new Error("FORBIDDEN");
    }
  } else if (user.role === "PROJECT_MANAGER") {
    if (task.project.createdById !== user.id) {
      throw new Error("FORBIDDEN");
    }
  } else if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  const nextStatuses = allowedTransitions[task.status];

  if (!nextStatuses.includes(input.status)) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }

  const result = await changeTaskStatus(
    task.id, user.id,
    input.status,
    task.projectId,
  );

  let notification = null;

  if (
    input.status === "IN_REVIEW" && task.assignedDeveloperId
  ) {
    notification = await createUserNotification({
      userId: task.assignedDeveloperId, type: "TASK_IN_REVIEW",
      title: "Task ready for review!", message: `The task "${(await result).task.title}" is ready for review!`,
      projectId: task.projectId, taskId: task.id,
    });
  }

  return {
    ...result, notification,
  }
}