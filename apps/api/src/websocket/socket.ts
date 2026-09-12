import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/tokens";
import { canAccessProject, canAccessTask } from "../services/resourcelevelauth.service";
import type { AuthUser } from "../types/auth";

export function initializeSocket(
  httpServer: HttpServer,
) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL ?? "http://localhost:5173",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (
      typeof token !== "string" ||
      token.length === 0
    ) {
      return next(
        new Error("Authentication required"),
      );
    }

    try {
      const payload = verifyAccessToken(token);

      if (
        typeof payload !== "object" ||
        !payload ||
        typeof payload.sub !== "string" ||
        typeof payload.email !== "string" ||
        typeof payload.role !== "string"
      ) {
        return next(new Error("Invalid access token"));
      }

      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role as AuthUser["role"],
      };

      next();
    } catch {
      next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as AuthUser;

    console.log(
      `Socket connected: ${user.email}`,
    );

    socket.join(`user:${user.id}`);

    socket.on(
      "project:join",
      async (projectId: unknown, callback) => {
        if (typeof projectId !== "string") {
          return callback?.({
            ok: false,
            error: "Invalid project ID",
          });
        }

        const allowed = await canAccessProject(
          user,
          projectId,
        );

        if (!allowed) {
          return callback?.({
            ok: false,
            error: "Forbidden",
          });
        }

        await socket.join(
          `project:${projectId}`,
        );

        callback?.({
          ok: true,
        });
      },
    );

    socket.on(
      "project:leave",
      async (projectId: unknown) => {
        if (typeof projectId !== "string") {
          return;
        }

        await socket.leave(
          `project:${projectId}`,
        );
      },
    );

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${user.email}`,
        reason,
      );
    });

    socket.on("task:join", async (taskId: unknown, callback) => {
      if (typeof taskId !== "string") {
        return callback?.({ ok: false, error: "Invalid task ID" });
      }
      const allowed = await canAccessTask(user, taskId);

      if (!allowed) {
        return callback?.({ ok: false, error: "Forbidden" });
      }
      
      await socket.join(`task:${taskId}`);
      
      console.log("TASK ROOM JOINED", {
        socketId: socket.id, userId: user.id,
        room: `task:${taskId}`, rooms: [...socket.rooms],
      });

      callback?.({ ok: true });
    });

    socket.on("task:test", (event) => {
      console.log("TASK TEST EVENT:", event);
    });
    
    socket.on("task:leave", async (taskId: unknown) => {
      if (typeof taskId !== "string") return;

      await socket.leave(`task:${taskId}`);
    });
  });

  return io;
}