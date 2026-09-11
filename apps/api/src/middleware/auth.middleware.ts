import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/tokens";
import type { AuthUser } from "../types/auth";

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export function authenticate(
    req: Request, res: Response, next: NextFunction,
) {
    const header = req.headers.authorization;

    if(!header?.startsWith("Bearer ")) {
        return res.status(401).json({
            error: {
                code: "UNAUTHORIZED", 
                message: "Authentication required",
            },
        });
    }

    const token = header.slice("Bearer ".length);

    try {
        const payload = verifyAccessToken(token);

        if (
            typeof payload !== "object" || !payload || 
            typeof payload.sub !== "string" || 
            typeof payload.email !== "string" ||
            typeof payload.role !== "string"
        ) {
            return res.status(401).json({
                error: {
                    code: "INVALID_TOKEN", 
                    message: "Invalid access token",
                },
            });
        }

        req.user = {
            id: payload.sub, email: payload.email,
            role: payload.role as AuthUser["role"],
        };

        next();
    } catch {
        return res.status(401).json({
            error: {
                code: "INVALID_TOKEN", 
                message: "Invalid or expired access token",
            },
        });
    }
}