import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";

// Resolve the Prisma client at runtime. When running the compiled build (dist),
// prefer the compiled client under dist/generated/prisma/client.js. During
// dev (tsx) the runtime loader will handle TypeScript imports directly, so
// require is not used in that case.
const projectRoot = path.resolve(__dirname, "..", "..");

// Candidate paths to require (in order of preference)
const candidates = [
  path.join(projectRoot, "dist", "generated", "prisma", "client.js"),
  path.join(projectRoot, "generated", "prisma", "client.js"),
  path.join(projectRoot, "generated", "prisma", "client.ts"),
];

let prismaClientModule: any = null;
for (const p of candidates) {
  if (fs.existsSync(p)) {
    // Use require for .js files; for .ts this will only work in dev when tsx supports it.
    try {
      prismaClientModule = require(p);
      break;
    } catch (err) {
      // continue to next candidate
    }
  }
}

if (!prismaClientModule) {
  throw new Error(
    `Unable to locate a generated Prisma client. Looked for: ${candidates.join(", ")}`
  );
}

const PrismaClient = prismaClientModule.PrismaClient ?? prismaClientModule.default ?? prismaClientModule;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

export const prisma = new PrismaClient({ adapter });
