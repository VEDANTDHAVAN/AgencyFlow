import "dotenv/config";
import { z } from "zod";

const clientUrl = process.env.CLIENT_URL ?? process.env.FRONTEND_URL ?? "http://localhost:5173";
if (!process.env.CLIENT_URL && process.env.FRONTEND_URL) {
  process.env.CLIENT_URL = process.env.FRONTEND_URL;
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),

  JWT_REFRESH_SECRET: z.string().min(32),

  FRONTEND_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);