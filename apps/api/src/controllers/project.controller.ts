import type { Request, Response } from "express";
import {
    createNewProject, getProject, getProjects,
    updateExistingProject,
} from "../services/project.service";
import {
    createProjectSchema, updateProjectSchema,
} from "../schemas/project.schema";

export async function listProjects(
    req: Request, res: Response,
) {
    try {
        const projects = await getProjects(req.user!);

        return res.json({data: projects});
    } catch {
        return res.status(500).json({
            error: {
                code: "INTERNAL_ERROR",
                message: "Failed to fetch projects!",
            },
        });
    }
}

export async function getProjectById(
    req: Request, res: Response,
) {
    try {
      if(typeof req.params.id !== "string") {
            return res.status(400).json({
                error: {
                    code: "INVALID_PROJECT_ID", 
                    message: "Invalid project ID",
                },
            });
        }

      const project = await getProject(req.params.id);

      return res.json({data: project});
    } catch (error) {
        if(
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

        return res.status(500).json({
            error: {
                code: "INTERNAL_ERROR",
                message: "Failed to fetch project",
            },
        });
    }
}

export async function create(
  req: Request,
  res: Response,
) {
  const parsed = createProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid project data",
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    const project = await createNewProject(
      req.user!,
      parsed.data,
    );

    return res.status(201).json({
      data: project,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You cannot create projects",
        },
      });
    }

    if (
      error instanceof Error &&
      error.message === "CLIENT_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: {
          code: "CLIENT_NOT_FOUND",
          message: "Client not found",
        },
      });
    }

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create project",
      },
    });
  }
}

export async function update(
  req: Request,
  res: Response,
) {
  const parsed = updateProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid project data",
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    if(typeof req.params.id !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_PROJECT_ID", 
          message: "Invalid project ID",
        },
      });
    }

    const project = await updateExistingProject(
      req.params.id,
      parsed.data,
    );

    return res.json({
      data: project,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CLIENT_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: {
          code: "CLIENT_NOT_FOUND",
          message: "Client not found",
        },
      });
    }

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update project",
      },
    });
  }
}