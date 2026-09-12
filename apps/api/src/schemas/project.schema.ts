import { z } from "zod";

export const createProjectSchema = z.object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(2000).optional(),
    clientId: z.uuid(),
});

export const updateProjectSchema = z.object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    clientId: z.uuid().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;