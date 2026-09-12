import type { AuthUser } from "../types/auth";
import { findProjectActivities } from "../repositories/activity.repository";
import { canAccessProject } from "./resourcelevelauth.service";

export async function getProjectActivities(
  user: AuthUser,
  projectId: string,
  limit = 20, since?: Date,
) {
  const allowed = await canAccessProject(
    user,
    projectId,
  );

  if (!allowed) {
    throw new Error("FORBIDDEN");
  }

  return findProjectActivities(
    projectId, Math.min(Math.max(limit, 1), 100), since,
  );
}