import { overdueTaskQueue } from "./queues";

export async function scheduleOverdueTaskJob() {
  await overdueTaskQueue.upsertJobScheduler(
    "overdue-task-scheduler",
    {
      every: 60_000,
    },
    {
      name: "check-overdue-tasks",
      data: {},
    },
  );

  console.log("Overdue task scheduler started");
}