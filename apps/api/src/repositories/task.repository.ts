import type {
  Prisma, TaskStatus,
} from "../../generated/prisma/client";
import { prisma } from "../config/prisma";

export async function findTasks() {
  return prisma.task.findMany({
    include: {
      project: {
        select: {
          id: true, name: true,
        },
      },
      assignedDeveloper: {
        select: {
          id: true, name: true, email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findTaskById(taskId: string) {
  return prisma.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      project: {
        select: {
          id: true, name: true,
          createdById: true,
        },
      },
      assignedDeveloper: {
        select: {
          id: true, name: true,
          email: true,
        },
      },
      statusHistory: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          changedBy: {
            select: {
              id: true, name: true,
              email: true, role: true,
            },
          },
        },
      },
    },
  });
}

export async function createTask(
  data: Prisma.TaskUncheckedCreateInput,
) {
  return prisma.task.create({
    data,
    include: {
      project: {
        select: {
          id: true, name: true,
        },
      },
      assignedDeveloper: {
        select: {
          id: true, name: true,
          email: true,
        },
      },
    },
  });
}

export async function updateTask(
  taskId: string,
  data: Prisma.TaskUpdateInput,
) {
  return prisma.task.update({
    where: {
      id: taskId,
    },
    data,
    include: {
      project: {
        select: {
          id: true, name: true,
        },
      },
      assignedDeveloper: {
        select: {
          id: true, name: true,
          email: true,
        },
      },
    },
  });
}

export async function changeTaskStatus(
  taskId: string,
  changedById: string,
  newStatus: TaskStatus,
  projectId: string,
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }

    if (task.status === newStatus) {
      throw new Error("STATUS_UNCHANGED");
    }

    const updatedTask = await tx.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: newStatus,
      },
    });

    const history = await tx.taskStatusHistory.create({
      data: {
        taskId,
        changedById,
        fromStatus: task.status,
        toStatus: newStatus,
      },
    });

    const activity = await tx.activity.create({
      data: {
        projectId,
        taskId,
        actorId: changedById,
        type: "TASK_STATUS_CHANGED",
        oldValue: task.status,
        newValue: newStatus,
      },
    });

    return {
      task: updatedTask,
      history,
      activity,
    };
  });
}