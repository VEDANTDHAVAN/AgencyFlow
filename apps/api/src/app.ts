import express from "express";
import cors from "cors";

import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "agencyflow-api",
  });
});

export default app;