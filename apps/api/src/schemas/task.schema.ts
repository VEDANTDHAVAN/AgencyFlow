import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  projectId: z.string().uuid(),
  assignedDeveloperId: z.string().uuid().nullable().optional(),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .default("MEDIUM"),
  dueDate: z.coerce.date().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  assignedDeveloperId: z.string().uuid().nullable().optional(),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum([
    "TODO", "IN_PROGRESS",
    "IN_REVIEW", "DONE",
  ]),
});

export type CreateTaskInput = z.infer<
  typeof createTaskSchema
>;

export type UpdateTaskInput = z.infer<
  typeof updateTaskSchema
>;

export type UpdateTaskStatusInput = z.infer<
  typeof updateTaskStatusSchema
>;