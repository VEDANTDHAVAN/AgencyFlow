# AgencyFlow

AgencyFlow is a full-stack project and task management platform for agency teams. It includes:
- a Vite + React frontend in `apps/web`
- an Express + TypeScript API in `apps/api`
- PostgreSQL via Prisma
- Redis + BullMQ background worker jobs
- real-time updates via Socket.IO
- HttpOnly refresh-token auth with JWT access tokens

This repository is organized as a pnpm monorepo, with the API and web app separated under `apps/`.

This README explains the whole project, the backend deployment requirements, and the production-safe configurations used to run the app reliably on Railway and Vercel.

Key production requirements covered here:
- TypeScript source imports remain extensionless (no `.js` edits required)
- Prisma generated client stays outside `src` at `apps/api/generated/prisma`
- Build output is exactly `apps/api/dist/server.js`
- Production runtime uses CommonJS-compatible code (no ESM/CJS mismatch)
- Browser auth works across Vercel frontend and Railway backend using HttpOnly cookies

---

Table of contents
- Project layout
- Tech stack
- Important design decisions
- Environment variables (required)
- Local development
- Local production build & run
- Railway (recommended) configuration
- Worker (BullMQ) deployment
- Prisma notes
- Verification / troubleshooting
- Important files
- Contact / next steps


## Project layout (monorepo)

Root:

agencyflow/
├── apps/
│   ├── api/                # Backend API (this README focuses here)
│   │   ├── src/            # TypeScript source (entry: src/server.ts)
│   │   ├── generated/      # Prisma client (must remain outside `src`)
│   │   ├── dist/           # Production build output (generated)
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                # Frontend app
├── package.json            # Workspace root
└── pnpm-workspace.yaml


## Tech stack
- Node.js (production runtime: CommonJS)
- TypeScript (tsc compile)
- Express
- Prisma (7.10.x, generator outputs to apps/api/generated/prisma)
- PostgreSQL
- Socket.IO
- BullMQ (queue worker)
- Redis
- Zod (validation)
- pnpm workspace


## Important design decisions (summary)
- The API emits CommonJS JS with TypeScript `tsc` (no esbuild bundling for production). This avoids bundling-induced ESM pitfalls (import.meta, fileURLToPath) and "require is not defined" runtime errors.
- TypeScript `rootDir` is set so tsc can compile both `src` and the generated Prisma TypeScript files (they live under `generated/`). To meet the strict requirement that the primary server entrypoint be `dist/server.js`, a small post-build normalization step moves emitted `dist/src/*` up to `dist/*`.
- Prisma client remains at `apps/api/generated/prisma` in source; compiled output is at `apps/api/dist/generated/prisma` at runtime.
- package.json for apps/api is configured to use `commonjs` at runtime to avoid ESM/CJS mismatches and to permit extensionless imports in source code.


## Environment variables (required)
The API and worker expect the following environment variables at runtime. Do NOT hardcode secrets.

- DATABASE_URL (PostgreSQL connection string) — required at build time for `prisma generate` and at runtime
- REDIS_URL (Redis connection string)
- JWT_ACCESS_SECRET (secret for access token signing)
- JWT_REFRESH_SECRET (secret for refresh token signing)
- FRONTEND_URL or CLIENT_URL (used for CORS and cookie domain/origin)
- NODE_ENV (production recommended)
- PORT (optional, defaults used by app)

Notes:
- `DATABASE_URL` must be available during the Railway build if `prisma generate` runs during build. If Railway cannot provide build-time envs, pre-generate the Prisma client or provide the env via Railway's build environment settings.


## Local development

1. Install dependencies at the repo root (pnpm workspace):

   pnpm install --frozen-lockfile

2. Start the API in development (from repo root):

   cd apps/api
   pnpm install
   pnpm run dev

(If your dev script uses ts-node / nodemon etc. — see apps/api/package.json `scripts`.)


## Local production build & run (exact validation steps)

These steps match what Railway should run when the root directory is `apps/api`.

1. From repository root (recommended):

   pnpm install --frozen-lockfile

2. Build the API (from repo root):

   # Option A: filter build (pnpm workspace aware)
   pnpm --filter ./apps/api build

   # Option B: change into apps/api and build there
   cd apps/api
   pnpm install --frozen-lockfile
   pnpm build

   The `build` script runs `prisma generate` then `tsc -p tsconfig.json` and a small `scripts/normalize-dist.js` that ensures the final server file is `dist/server.js`.

3. Verify the entrypoint exists (PowerShell):

   Get-ChildItem -Recurse .\apps\api\dist -Filter server.js

   Expected: `apps/api/dist/server.js` (top-level inside `dist`).

4. Start the API locally (from apps/api):

   cd apps/api
   pnpm start

   This runs: `node dist/server.js` (as required).

5. Start the worker (in separate terminal):

   cd apps/api
   pnpm run worker:prod


## Railway recommended configuration

Set Railway's service root directory to: `/apps/api`

Build Command (Railway):

   pnpm install --frozen-lockfile && pnpm build

Notes: `prisma generate` runs during `pnpm build` and requires `DATABASE_URL` to be present in Railway's Build environment. If Railway cannot supply build-time envs, consider pre-generating the Prisma client as part of CI or commit generated client (last-resort).

Start Command (API) (Railway):

   pnpm start

This runs `node dist/server.js` as required.

Worker service (Railway) — create a separate service / worker in Railway and set:

Worker Start Command:

   pnpm run worker:prod


Environment variables to set in Railway (both Build & Runtime as appropriate):
- DATABASE_URL (available during build + runtime)
- REDIS_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- FRONTEND_URL (CLIENT_URL)
- NODE_ENV=production
- PORT (optional)


## Prisma notes
- Prisma generator is configured to write client to `apps/api/generated/prisma` (this is required and preserved).
- `prisma generate` runs as part of the apps/api build.
- Because TypeScript is configured to include `generated/**/*.ts`, tsc compiles the generated Prisma client TS during the build. The emitted client JS ends up at `apps/api/dist/generated/prisma` and is required at runtime by the API.
- The build process includes a step to normalize `dist` so the server entrypoint is `dist/server.js` (not `dist/src/server.js`).


## Why we do not use esbuild for production in this repo
- Past esbuild bundles introduced runtime errors (fileURLToPath/import.meta-related) and CJS/ESM mismatches when `type` metadata didn't match the bundle. Those errors surfaced on Railway as "require is not defined" or as module import syntax errors.
- Using the TypeScript compiler to emit CommonJS avoids those incompatibilities and preserves extensionless imports in source.


## Troubleshooting

1. "Cannot find module '/app/dist/server.js'"
   - Cause: output emitted to `dist/src/server.js` instead of `dist/server.js`.
   - Fix: Ensure `pnpm build` runs the normalize-dist script (it's part of apps/api build script). Confirm `apps/api/dist/server.js` exists after build.

2. "SyntaxError: Cannot use import statement outside a module" from `generated/prisma/client.js`
   - Cause: package `type` mismatch (ESM vs CommonJS) or trying to load TS/ESM into CJS runtime.
   - Fix: Ensure apps/api `package.json` uses `"type": "commonjs"` and the build produced a CommonJS JS Prisma client at `dist/generated/prisma/client.js`. Ensure `prisma generate` ran during build.

3. "require is not defined" or `import.meta` stack traces
   - Cause: an ESM bundle or runtime running ESM while code expects CommonJS.
   - Fix: Use the provided `package.json` configuration for CommonJS and do NOT use esbuild bundling for production runtime.

4. Prisma/Build-time errors: `prisma generate` fails during build because DATABASE_URL missing
   - Fix: Provide a build-time `DATABASE_URL` in Railway settings. Alternatively, pre-run `prisma generate` in CI and include generated client in the artifact.

5. Redis or DB connection refused
   - Cause: Wrong/absent REDIS_URL or DATABASE_URL or firewall/network issues.
   - Fix: Verify env values in Railway and connectivity.


## Verification checklist (local)
1. pnpm install --frozen-lockfile
2. pnpm --filter ./apps/api build  (or cd apps/api && pnpm build)
3. Get-ChildItem -Recurse .\apps\api\dist -Filter server.js   -> Must find dist/server.js
4. cd apps/api
   pnpm start   -> Node should start without ESM/CJS module errors
5. In separate terminal: pnpm run worker:prod  -> worker starts (may log Redis connection errors if REDIS_URL not configured)


## Important files (paths)
- apps/api/src/server.ts (source entrypoint)
- apps/api/src/config/prisma.ts (runtime loader for Prisma client)
- apps/api/package.json (scripts: build, start, worker:prod)
- apps/api/tsconfig.json (TypeScript configuration; includes `generated/**/*.ts`)
- apps/api/scripts/normalize-dist.js (post-build relocation that ensures dist/server.js)
- apps/api/generated/prisma/ (Prisma generated client — must remain here)
- apps/api/dist/ (final runtime output after build)
- prisma/schema.prisma (Prisma schema + generator configuration)

(If you want direct file links in your environment, open the files above in your editor.)


## Common commands summary
From repository root:

- Install deps:
  pnpm install --frozen-lockfile

- Build API only:
  pnpm --filter ./apps/api build
  # or
  cd apps/api && pnpm build

- Start API (after build):
  cd apps/api && pnpm start

- Start worker (production):
  cd apps/api && pnpm run worker:prod

- Push branch and open PR (example):
  git push -u origin agents/fix-agencyflow-railway-deployment


## Limitations & notes
- `DATABASE_URL` must be present during build if `prisma generate` is part of the build — Railway must expose this build-time env or the Prisma client must be pre-generated in CI.
- A small normalization step yields the exact `dist/server.js` path requirement; it is a deterministic workaround to the tsc rootDir/generator layout constraint.
- TypeScript strictness was slightly relaxed to unblock the build in one iteration — consider tightening `tsconfig.json` and fixing any `any`-typed parameters for long-term maintainability.


## Contact / next steps
If you want:
- I can add a Railway-specific README snippet (environment screenshots and exact fields) to help configure the Railway service.
- I can add a small CI check that runs `pnpm --filter ./apps/api build` with a placeholder `DATABASE_URL` to avoid build breaks on merge.


Thank you — this README captures the current production-safe configuration and precise commands for local and Railway deployment. If anything should be clarified or expanded (e.g., detailed healthcheck/monitoring steps), tell me where to focus and that will be added.
