import type { NextFunction, Request, Response } from "express";
import type { Role } from "../../generated/prisma/enums";

export function requireRoles(...roles: Role[]) {
  return (
    req: Request, res: Response, next: NextFunction,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        },
      });
    }

    next();
  };
}