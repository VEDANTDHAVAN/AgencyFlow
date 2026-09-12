import type { AuthUser } from "../types/auth";
import {
    createProject, findProjectById, findProjects, updateProject,
} from "../repositories/project.repository";
import type {
    CreateProjectInput, UpdateProjectInput,
} from "../schemas/project.schema";
import { prisma } from "../config/prisma";

export async function getProjects(user: AuthUser) {
    return findProjects(user.id, user.role);
}

export async function getProject(projectId: string) {
    const project = await findProjectById(projectId);

    if (!project) {
        throw new Error("PROJECT_NOT_FOUND");
    }
    
    return project;
}

export async function createNewProject(
    user: AuthUser, input: CreateProjectInput,
) {
    if(
        user.role !== "ADMIN" && 
        user.role !== "PROJECT_MANAGER"
    ) {
        throw new Error("FORBIDDEN");
    }

    const client = await prisma.client.findUnique({
        where: {
            id: input.clientId,
        }, select: {
            id: true,
        },
    });

    if(!client) {
        throw new Error("CLIENT_NOT_FOUND");
    }

    return createProject({
        name: input.name, description: input.description,
        clientId: input.clientId, createdById: user.id,
    });
}

export async function updateExistingProject(
    projectId: string, input: UpdateProjectInput,
) {
    if(input.clientId) {
        const client = await prisma.client.findUnique({
            where: {
                id: input.clientId,
            }, select: {
                id: true,
            },
        });

        if(!client) {
            throw new Error("CLIENT_NOT_FOUND");
        }
    }

    return updateProject(projectId, input);
}