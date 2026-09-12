import type { Request, Response } from "express";
import { getProjectActivities } from "../services/activity.service";

export async function listProjectActivities(
  req: Request,
  res: Response,
) {
  const projectId = req.params.id;

  if (typeof projectId !== "string") {
    return res.status(400).json({
      error: {
        code: "INVALID_PROJECT_ID",
        message: "Invalid project ID",
      },
    });
  }

  const rawLimit = req.query.limit;

  let limit = 20;

  if (typeof rawLimit === "string") {
    const parsedLimit = Number(rawLimit);

    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({
        error: {
          code: "INVALID_LIMIT",
          message: "Limit must be a positive integer",
        },
      });
    }

    limit = parsedLimit;
  }

  try {
    const activities = await getProjectActivities(
      req.user!,
      projectId,
      limit,
    );

    return res.json({
      data: activities,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this project",
        },
      });
    }

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch activity",
      },
    });
  }
}