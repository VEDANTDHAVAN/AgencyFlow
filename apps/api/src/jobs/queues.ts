import { Queue } from "bullmq";
import { env } from "../config/env";

export const overdueTaskQueue = new Queue(
  "overdue-tasks",
  {
    connection: {
      url: env.REDIS_URL,
    },
  },
);