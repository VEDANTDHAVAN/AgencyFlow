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
  const rawSince = req.query.since;

  const limit = rawLimit === undefined ? 20 : Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      error: {
        code: "INVALID_LIMIT",
        message: "Limit must be an integer between 1 and 100",
      },
    });
  }

  let since: Date | undefined;

  if (rawSince !== undefined) {
    if (typeof rawSince !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_SINCE",
          message: "Since must be an ISO timestamp",
        },
      });
    }

    const parsedSince = new Date(rawSince);

    if (Number.isNaN(parsedSince.getTime())) {
      return res.status(400).json({
        error: {
          code: "INVALID_SINCE",
          message: "Since must be a valid ISO timestamp",
        },
      });
    }

    since = parsedSince;
  }

  try {
    const activities = await getProjectActivities(
      req.user!,
      projectId,
      limit,
      since,
    );

    return res.status(200).json({
      activities,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this project",
        },
      });
    }

    throw error;
  }
}