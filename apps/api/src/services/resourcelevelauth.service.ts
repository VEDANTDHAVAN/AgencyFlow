import { prisma } from "../config/prisma";
import type { AuthUser } from "../types/auth";

export async function canAccessProject(
    user: AuthUser, projectId: string,
): Promise<boolean> {
    // Admin has unrestricted access.
    if (user.role === "ADMIN") {
        return true;
    }

    // Project managers can access projects they created.
    if (user.role === "PROJECT_MANAGER") {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId, createdById: user.id,
            }, select: {
                id: true,
            },
        });

        return Boolean(project);
    }

    // Developers don't get project-level access.
    return false;
}

export async function canAccessTask(
    user: AuthUser, taskId: string,
): Promise<boolean> {
    if(user.role === "ADMIN") {
        return true;
    }

    if(user.role === "PROJECT_MANAGER") {
        const task = await prisma.task.findFirst({
            where: {
                id: taskId, project: {
                    createdById: user.id,
                },
            }, select: {
                id: true,
            },
        });

        return Boolean(task);
    }

    if (user.role === "DEVELOPER") {
        const task = await prisma.task.findFirst({
            where: {
                id: taskId, assignedDeveloperId: user.id,
            }, select: {
                id: true,
            },
        });

        return Boolean(task);
    }
    return false;
}

export async function canChangeTaskStatus(
  user: AuthUser, taskId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") {
    return true;
  }

  if (user.role === "PROJECT_MANAGER") {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          createdById: user.id,
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(task);
  }

  if (user.role === "DEVELOPER") {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        assignedDeveloperId: user.id,
      },
      select: {
        id: true,
      },
    });

    return Boolean(task);
  }

  return false;
}