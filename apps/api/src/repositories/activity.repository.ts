import { prisma } from "../config/prisma";

export async function findProjectActivities(
  projectId: string,
  limit = 20,
) {
  return prisma.activity.findMany({
    where: {
      projectId,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}