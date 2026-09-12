import { prisma } from "../config/prisma";

export async function findProjects(userId: string, role: string) {
    return prisma.project.findMany({
        where: role === "ADMIN" ? undefined : {
            createdById: userId,
        }, include: {
            client: {
                select: {
                    id: true, name: true, company: true,
                },
            }, _count: {
                select: {
                    tasks: true,
                },
            },
        }, orderBy: {
            createdAt: "desc",
        },
    });
}

export async function findProjectById(projectId: string) {
    return prisma.project.findUnique({
        where: {
            id: projectId,
        }, include: {
            client: {
                select: {
                    id: true, name: true, company: true,
                },
            }, creator: {
                select: {
                    id: true, name: true, email: true, role: true,
                },
            }, _count: {
                select: {
                    tasks: true,
                },
            },
        },
    });
}

export async function createProject(data: {
    name: string, description?: string,
    clientId: string, createdById: string, 
}) {
    return prisma.project.create({data});
}

export async function updateProject(
    projectId: string, data: {
        name?: string, clientId?: string,
        description?: string | null; 
    },
) {
    return prisma.project.update({
        where: {
            id: projectId,
        }, data,
    });
}