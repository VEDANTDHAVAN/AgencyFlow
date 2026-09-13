import { Queue } from "bullmq";
import { env } from "../config/env";
import IORedis from "ioredis";

const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const overdueTaskQueue = new Queue(
  "overdue-tasks",
  {
    connection: redis,
  },
);