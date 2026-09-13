import { Worker } from "bullmq";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import IORedis from "ioredis";

const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "overdue-tasks",
  async () => {
    const now = new Date();

    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          not: "DONE",
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
      },
    });

    console.log(
      `Found ${overdueTasks.length} overdue tasks`,
    );

    for (const task of overdueTasks) {
      console.log("OVERDUE TASK:", {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        status: task.status,
      });
    }

    return {
      processed: overdueTasks.length,
    };
  },
  {
    connection: redis,
  },
);

worker.on("completed", (job) => {
  console.log(`Overdue job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(
    `Overdue job ${job?.id} failed:`,
    error,
  );
});