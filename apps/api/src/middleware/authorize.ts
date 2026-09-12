import type { NextFunction, Request, Response } from "express";
import {
    canAccessProject, canAccessTask,
} from "../services/resourcelevelauth.service";

export function authorizeProject() {
    return async (
        req: Request, res: Response, next: NextFunction,
    ) => {
        if(!req.user) {
            return res.status(401).json({
                error: {
                    code: "UNAUTHORIZED",
                    message: "Authentication required",
                },
            });
        }

        const projectId = req.params.id;

        if(typeof projectId !== "string") {
            return res.status(400).json({
                error: {
                    code: "INVALID_PROJECT_ID", 
                    message: "Invalid project ID",
                },
            });
        }

        const allowed = await canAccessProject(req.user, projectId);
        
        console.log("Project access: ", allowed);

        if(!allowed) {
            return res.status(403).json({
                error: {
                    code: "FORBIDDEN", 
                    message: "You do not have access to this project.",
                },
            });
        }
        next();
    };
}

export function authorizeTask() {
    return async (
        req: Request, res: Response, next: NextFunction,
    ) => {
        if (!req.user) {
            return res.status(401).json({
                error: {
                    code: "UNAUTHORIZED", message: "Authentication required",
                },
            });
        }

        if(typeof req.params.id !== "string") {
            return res.status(400).json({
                error: {
                    code: "INVALID_TASK_ID", 
                    message: "Invalid task ID",
                },
            });
        }

        const taskId = req.params.id;

        const allowed = await canAccessTask(
            req.user, taskId,
        );

        if(!allowed) {
            return res.status(403).json({
                error: {
                    code: "FORBIDDEN", 
                    message: "You do not have access to this task",
                },
            });
        }
        next();
    };
}