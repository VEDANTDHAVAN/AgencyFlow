import {
  PrismaClient,
  Role,
  TaskPriority,
  TaskStatus,
  ActivityType,
  NotificationType,
} from "../generated/prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Seeding AgencyFlow...");

  // Clear existing development data.
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.taskStatusHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 12);

  // Users
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      name: "Project Manager One",
      email: "pm1@example.com",
      passwordHash,
      role: Role.PROJECT_MANAGER,
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      name: "Project Manager Two",
      email: "pm2@example.com",
      passwordHash,
      role: Role.PROJECT_MANAGER,
    },
  });

  const developers = await Promise.all(
    [1, 2, 3, 4].map((i) =>
      prisma.user.create({
        data: {
          name: `Developer ${i}`,
          email: `dev${i}@example.com`,
          passwordHash,
          role: Role.DEVELOPER,
        },
      }),
    ),
  );

  const [dev1, dev2, dev3, dev4] = developers;

  // Clients
  const clientA = await prisma.client.create({
    data: {
      name: "Acme Corporation",
      company: "Acme Corp",
      email: "contact@acme.example",
    },
  });

  const clientB = await prisma.client.create({
    data: {
      name: "Globex Industries",
      company: "Globex",
      email: "contact@globex.example",
    },
  });

  const clientC = await prisma.client.create({
    data: {
      name: "Wayne Enterprises",
      company: "Wayne Enterprises",
      email: "contact@wayne.example",
    },
  });

  // Projects
  const projectA = await prisma.project.create({
    data: {
      name: "Acme Website Redesign",
      description: "Corporate website redesign.",
      clientId: clientA.id,
      createdById: pm1.id,
    },
  });

  const projectB = await prisma.project.create({
    data: {
      name: "Acme Mobile Platform",
      description: "Mobile application development.",
      clientId: clientA.id,
      createdById: pm1.id,
    },
  });

  const projectC = await prisma.project.create({
    data: {
      name: "Globex Internal Portal",
      description: "Internal operations portal.",
      clientId: clientB.id,
      createdById: pm2.id,
    },
  });

  // Tasks
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 3);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);

  const task1 = await prisma.task.create({
    data: {
      title: "Build landing page",
      description: "Implement responsive landing page.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: futureDate,
      projectId: projectA.id,
      assignedDeveloperId: dev1.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Implement authentication UI",
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      dueDate: overdueDate,
      projectId: projectA.id,
      assignedDeveloperId: dev2.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: "Prepare mobile dashboard",
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      dueDate: futureDate,
      projectId: projectB.id,
      assignedDeveloperId: dev1.id,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: "Database integration",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: overdueDate,
      projectId: projectC.id,
      assignedDeveloperId: dev3.id,
    },
  });

  const task5 = await prisma.task.create({
    data: {
      title: "Build reporting module",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.LOW,
      dueDate: futureDate,
      projectId: projectC.id,
      assignedDeveloperId: dev4.id,
    },
  });

  // Status history
  await prisma.taskStatusHistory.createMany({
    data: [
      {
        taskId: task1.id,
        changedById: dev1.id,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
      },
      {
        taskId: task3.id,
        changedById: dev1.id,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
      },
      {
        taskId: task4.id,
        changedById: dev3.id,
        fromStatus: TaskStatus.IN_REVIEW,
        toStatus: TaskStatus.DONE,
      },
      {
        taskId: task5.id,
        changedById: dev4.id,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
      },
    ],
  });

  // Activity
  await prisma.activity.createMany({
    data: [
      {
        projectId: projectA.id,
        taskId: task1.id,
        actorId: dev1.id,
        type: ActivityType.TASK_STATUS_CHANGED,
        oldValue: TaskStatus.TODO,
        newValue: TaskStatus.IN_PROGRESS,
      },
      {
        projectId: projectA.id,
        taskId: task2.id,
        actorId: pm1.id,
        type: ActivityType.TASK_CREATED,
      },
      {
        projectId: projectB.id,
        taskId: task3.id,
        actorId: dev1.id,
        type: ActivityType.TASK_STATUS_CHANGED,
        oldValue: TaskStatus.IN_PROGRESS,
        newValue: TaskStatus.IN_REVIEW,
      },
      {
        projectId: projectC.id,
        taskId: task4.id,
        actorId: dev3.id,
        type: ActivityType.TASK_STATUS_CHANGED,
        oldValue: TaskStatus.IN_REVIEW,
        newValue: TaskStatus.DONE,
      },
    ],
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: dev1.id,
        type: NotificationType.TASK_ASSIGNED,
        title: "Task assigned",
        message: "You were assigned to Build landing page.",
        projectId: projectA.id,
        taskId: task1.id,
      },
      {
        userId: pm1.id,
        type: NotificationType.TASK_IN_REVIEW,
        title: "Task ready for review",
        message: "Prepare mobile dashboard is ready for review.",
        projectId: projectB.id,
        taskId: task3.id,
      },
    ],
  });

  console.log("✅ Seed completed");
  console.log(`Admin: ${admin.email}`);
  console.log(`PMs: ${pm1.email}, ${pm2.email}`);
  console.log(`Developers: ${developers.map((d) => d.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });