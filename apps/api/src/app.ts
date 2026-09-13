import express from "express";
import cors from "cors";

import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.routes";
import notificationRoutes from "./routes/notification.routes";

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
  ].filter((value): value is string => Boolean(value)),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/tasks", taskRoutes);
app.use("/notifications", notificationRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "agencyflow-api",
  });
});

export default app;