import express from "express";
import cors from "cors";

import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.routes";
import notificationRoutes from "./routes/notification.routes";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? process.env.ALLOWED_ORIGINS,
    credentials: true,
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