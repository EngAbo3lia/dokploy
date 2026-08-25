# Dokploy Development Handbook

Everything we did, how we did it, and the gotchas that will bite you if you forget.

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Branch Strategy & PRs](#2-branch-strategy--prs)
3. [Local Test Environment](#3-local-test-environment)
4. [Build Pipeline](#4-build-pipeline)
5. [Docker Patch & Deploy](#5-docker-patch--deploy)
6. [Verification Workflow](#6-verification-workflow)
7. [Key Patterns](#7-key-patterns)
8. [Common Issues & Fixes](#8-common-issues--fixes)
9. [Local-Only Files (Never Commit)](#9-local-only-files-never-commit)
10. [Commit History](#10-commit-history)
11. [Production Deployment (Swarm)](#11-production-deployment-swarm)

---

## 1. Project Architecture

### Monorepo Layout

```
Dokploy/
├── apps/
│   └── dokploy/              # Next.js 16 frontend + tRPC server
│       ├── pages/             # Pages Router (not App Router)
│       ├── components/        # React components
│       ├── server/           # tRPC routers, middleware, auth
│       ├── public/           # Static assets
│       ├── esbuild.config.ts # Server bundle config
│       └── package.json      # "dokploy" v0.30.2
├── packages/
│   └── server/               # @dokploy/server — shared backend services
│       ├── src/
│       │   ├── services/     # Business logic (compose, project-health, etc.)
│       │   ├── utils/        # Builders, helpers
│       │   ├── db/           # Drizzle ORM schema + queries
│       │   └── index.ts      # Barrel export
│       └── package.json      # @dokploy/server
├── Dockerfile.patch          # Local-only overlay image
├── docker-compose.test.yml   # Local test stack
└── package.json              # Root workspace
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (Pages Router), React 19, Tailwind CSS 4, shadcn/ui |
| API | tRPC v11 (typed RPC, no separate REST layer) |
| Backend | Node.js, esbuild-bundled server entry |
| Database | PostgreSQL 16 (Drizzle ORM, raw SQL queries) |
| Cache | Redis 7 |
| Proxy | Traefik v3.3 |
| Package Manager | pnpm 10 (workspaces) |
| Linter | Biome 2.5 |
| TypeScript | 7.0, `noUncheckedIndexedAccess: true` |

### tRPC Router Structure

Routers live in `apps/dokploy/server/api/routers/`:
- `project.ts` — projects, environments, **health** (new), **healthAll** (new)
- `compose.ts` — compose services, deploy, redeploy, stop, readLogs
- `docker.ts` — container operations, getContainers
- `deployment.ts` — deployment history
- `domain.ts` — domain CRUD
- `user.ts` — auth, metrics token, container metrics

### Server Build Pipeline

The `@dokploy/server` package compiles TypeScript → ESM `.js` files with `tsc-alias`:

```
packages/server/src/services/compose.ts
  → packages/server/dist/services/compose.js   (ESM, relative imports with .js)
```

The `build` script runs `switchToDist.js` which rewrites `package.json`'s `main` field
from `./src/index.ts` to `./dist/index.js`. **You must revert this before committing.**

```bash
# Build server
pnpm --filter @dokploy/server run build

# This modifies packages/server/package.json — revert it:
git checkout packages/server/package.json
```

### Frontend Build

```
apps/dokploy/
  esbuild.config.ts  → dist/server.mjs, dist/migration.mjs  (backend entry)
  next build         → .next/                              (static chunks)
```

Build command: `pnpm --filter dokploy run build` (= `build-server` + `build-next`).

For iteration, you can run them separately:
```bash
pnpm --filter dokploy run build-server   # esbuild, ~10s
pnpm --filter=./apps/dokploy run build   # next build, ~5-8 min
```

---

## 2. Branch Strategy & PRs

### Branches

| Branch | Purpose | Base |
|--------|---------|------|
| `feat/compose-auto-rollback` | Transactional deploys + auto-rollback | `canary` |
| `feat/project-control-center` | Full UI redesign + rollback merged in | `canary` |

### Remotes

```
origin   = https://github.com/EngAbo3lia/dokploy.git   (fork)
upstream = https://github.com/Dokploy/dokploy.git       (official)
```

### PR

- **PR #5182**: `feat/compose-auto-rollback` → `Dokploy/dokploy:canary`
  URL: https://github.com/Dokploy/dokploy/pull/5182

### Workflow

```bash
# Create feature branch from canary
git checkout origin/canary -b feat/my-feature

# Work, commit, push
git push origin feat/my-feature

# Merge rollback branch into control-center
git checkout feat/project-control-center
git merge origin/feat/compose-auto-rollback

# Open PR to upstream
gh pr create --repo Dokploy/dokploy --base canary --head EngAbo3lia:feat/my-feature
```

### Commit Convention

Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

Examples from this project:
```
feat(compose): redesign service details into Overview/Deployments/Logs/Configuration
fix(env): address UX roast — operational clarity over feature density
feat(project): project health overview with real container runtime status
```

---

## 3. Local Test Environment

### Docker Compose Stack

File: `docker-compose.test.yml` (local-only, never committed)

```
┌─────────────────────────────────────────────────┐
│ docker-compose.test.yml                          │
│                                                  │
│  dokploy-test     (dokploy-local:patch image)   │
│    ├─ port 3000 (Next.js)                        │
│    ├─ /var/run/docker.sock mounted               │
│    └─ depends on postgres                        │
│                                                  │
│  dokploy-test-postgres  (postgres:16-alpine)    │
│    └─ port 5432                                  │
│                                                  │
│  dokploy-test-redis     (redis:7-alpine)         │
│                                                  │
│  dokploy-test-traefik   (traefik:v3.3)           │
│    └─ port 9080 → 80 (HTTP)                      │
└─────────────────────────────────────────────────┘
```

### First-Time Setup

```bash
# 1. Create the external network
docker network create dokploy-network

# 2. Create .env.production.local (root)
#    Copy from apps/dokploy/.env.production.example
cp apps/dokploy/.env.production.example .env.production.local

# 3. Create .env.production (root, for Dockerfile.patch)
cp apps/dokploy/.env.production.example .env.production

# 4. Create apps/dokploy/.env (for dev/build)
cp apps/dokploy/.env.example apps/dokploy/.env

# 5. Install font workaround (if Google Fonts is blocked)
pnpm --filter dokploy add @fontsource/inter
# Then edit apps/dokploy/pages/_app.tsx to use @fontsource/inter
# instead of next/font/google (see section 8)

# 6. Start the stack
docker compose -f docker-compose.test.yml up -d

# 7. Wait for health
docker inspect dokploy-test --format "{{.State.Health.Status}}"
# Should return "healthy" within ~60s
```

### Accessing the Local Instance

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Direct Next.js |
| `http://localhost:9080` | Via Traefik (use this for full-stack testing) |

API key: `bcc9c314-3c90-4b8e-a8c8-4c5b0b3f8f0e`

### Test Data

| Entity | ID |
|--------|-----|
| Project | `RCQiN2Sy_6g_CydSqZvLC` (name: "test") |
| Environment | `HJ_SngBRg8a4OZGZtdZBB` (name: "production") |
| Compose Service | `W44xTfgAhFYPEHtJOiGyD` (name: "poslite") |

---

## 4. Build Pipeline

### Overview

```
                    ┌──────────────────┐
                    │  1. Server build  │  pnpm --filter @dokploy/server run build
                    │  (tsc + tsc-alias)│  → packages/server/dist/*.js
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  2. Copy dist    │  Copy specific .js files to root
                    │  files to root    │  compose.js, services-compose.js
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  3. Server bundle │  pnpm --filter dokploy run build-server
                    │  (esbuild, ~10s)  │  → apps/dokploy/dist/server.mjs
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  4. Next.js build │  pnpm --filter=./apps/dokploy run build
                    │  (~5-8 min)       │  → apps/dokploy/.next/
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  5. Patch image   │  docker build -f Dockerfile.patch
                    │  OR docker cp     │  OR docker cp .next into running container
                    └──────────────────┘
```

### Step-by-Step

#### Step 1: Build Server (only if backend changed)

```bash
pnpm --filter @dokploy/server run build
```

**WARNING**: This runs `switchToDist.js` which modifies `packages/server/package.json`.
Always revert before committing:
```bash
git checkout packages/server/package.json
```

#### Step 2: Copy dist files to root (only if backend changed)

The Docker image has `node_modules/@dokploy/server/dist/` pre-installed from
the base image. We overlay specific files that changed:

```bash
# Copy the CORRECT file to each slot — mixing these causes ERR_MODULE_NOT_FOUND

# compose.js comes from builders, NOT from services:
cp packages/server/dist/utils/builders/compose.js ./compose.js

# services-compose.js comes from services:
cp packages/server/dist/services/compose.js ./services-compose.js
```

**Why two separate files?** The ESM imports use relative paths with `.js` extensions.
`compose.js` (from `utils/builders/`) imports `../../constants/index.js`.
`services-compose.js` (from `services/`) imports `../constants/index.js`.
If you copy the wrong file to a slot, the relative import paths break and the server
crashes with `ERR_MODULE_NOT_FOUND`.

#### Step 3: Build server bundle (always, fast)

```bash
pnpm --filter dokploy run build-server
```

This runs `esbuild.config.ts` and produces `apps/dokploy/dist/server.mjs` + `migration.mjs`.
Takes ~10 seconds.

#### Step 4: Build Next.js (always, slow)

```bash
# Detached build (Windows PowerShell):
$env:NODE_OPTIONS='--dns-result-order=ipv4first'
pnpm --filter=./apps/dokploy run build
```

Takes 5-8 minutes. The `NODE_OPTIONS` flag is needed to avoid DNS resolution issues
with Google Fonts on some networks.

**Font workaround**: If `next/font/google` fails (network blocked), use `@fontsource/inter`:
```tsx
// apps/dokploy/pages/_app.tsx
// Replace next/font/google with:
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
// And remove the next/font/google import + className assignment
```

**Clear cache before rebuild** (if you see stale chunks):
```bash
rd /s /q apps\dokploy\.next\cache
```

---

## 5. Docker Patch & Deploy

### Method A: Rebuild Image (Full)

Use this when backend files changed (new dist overlay needed).

```bash
# Build patched image
docker build -f Dockerfile.patch -t dokploy-local:patch .

# Restart
docker compose -f docker-compose.test.yml up -d
```

#### Dockerfile.patch

```dockerfile
FROM dokploy/dokploy:canary
COPY apps/dokploy/.next /app/.next
COPY apps/dokploy/public /app/public
COPY apps/dokploy/dist /app/dist
COPY compose.js /app/node_modules/@dokploy/server/dist/utils/builders/compose.js
COPY services-compose.js /app/node_modules/@dokploy/server/dist/services/compose.js
COPY packages/server/dist/index.js /app/node_modules/@dokploy/server/dist/index.js
COPY packages/server/dist/services/project-health.js /app/node_modules/@dokploy/server/dist/services/project-health.js
```

### Method B: Docker CP (Fast, Frontend-Only)

Use this when only `.next` changed (frontend-only, no backend changes).

```bash
# Copy .next into running container (~2 min for ~300MB)
docker cp apps/dokploy/.next dokploy-test:/app/.next

# Restart to pick up changes
docker restart dokploy-test
```

**This is 10x faster than rebuilding the image.** Always prefer this method
when you haven't changed any server/dist files.

### Method C: Docker CP (Specific Files)

For surgical patches (single chunk, single dist file):

```bash
# Copy a single dist file
docker cp packages/server/dist/services/project-health.js \
  dokploy-test:/app/node_modules/@dokploy/server/dist/services/project-health.js

# Copy entire .next (for frontend)
docker cp apps/dokploy/.next dokploy-test:/app/.next

docker restart dokploy-test
```

---

## 6. Verification Workflow

### Health Check

```bash
# Wait for container to become healthy
for ($i=0; $i -lt 12; $i++) {
    Start-Sleep 10
    $st = docker inspect dokploy-test --format "{{.State.Health.Status}}"
    if ($st -eq "healthy") { break }
}
Write-Host "health: $st"
```

### Chunk Verification

Verify new strings are present in the deployed Next.js chunks:

```bash
# Check environment page chunks
docker exec dokploy-test sh -c \
  "grep -rlo 'Docker Compose\|Deploy all.*service\|of.*selected' \
   /app/.next/static/chunks/pages/dashboard/project/ 2>/dev/null | head -5"
```

### API Verification

```bash
# Test project.health endpoint
curl -s http://localhost:3000/api/trpc/project.health \
  -H "x-api-key: bcc9c314-3c90-4b8e-a8c8-4c5b0b3f8f0e" \
  -H "content-type: application/json" \
  -d '{"json":{"projectId":"RCQiN2Sy_6g_CydSqZvLC"}}' | jq

# Test project.healthAll
curl -s http://localhost:3000/api/trpc/project.healthAll \
  -H "x-api-key: bcc9c314-3c90-4b8e-a8c8-4c5b0b3f8f0e" \
  -d '{}' | jq
```

### Typecheck

Always run before committing:

```bash
pnpm --filter dokploy run typecheck
```

Common failures:
- `TS6133: '<import>' is declared but never read` — remove unused imports
- `TS2538: Type 'undefined' cannot be used as an index` — guard with `if (!x) return`

---

## 7. Key Patterns

### tRPC Client (React)

```tsx
// Imperative fetch (not useQuery hook):
const utils = api.useUtils();
const data = await utils.project.health.fetch({ projectId });

// Mutation:
const { mutateAsync } = api.compose.deploy.useMutation();
await mutateAsync({ composeId, title: "Project deploy" });
```

**Never** use `api.router.procedure.fetch()` directly — it doesn't exist on
`DecoratedQuery`. Always go through `useUtils()`.

### Health Status Model

The `ServiceRuntimeDot` and `STATUS_META` use these states:

| State | Meaning | Color |
|-------|---------|-------|
| `healthy` | All containers running + healthy | Emerald |
| `degraded` | Some containers restarting/unhealthy | Amber |
| `deploying` | Deployment in progress | Blue (pulsing) |
| `failed` | Deployment failed or containers stopped | Red |
| `stopped` | No containers running | Muted |
| `unknown` | Cannot determine state | Muted |

**Running ≠ Healthy**: A container can be `Running` (Docker says up) but have
a failing health check. The UI shows both separately:
- Card badge: `● Running` (container state)
- Card content: `N containers · N running · N healthy`

### Pluralization

Always use conditional plural:
```tsx
{count} service{count !== 1 ? "s" : ""}
{count} container{count !== 1 ? "s" : ""}
{count} domain{count !== 1 ? "s" : ""}
```

### URL-Backed Tabs

The environment page uses URL query params for tab state:
```tsx
const [tab, setTab] = useState<ProjectTab>(() => {
    const queryTab = router.query.tab as ProjectTab;
    return queryTab && VALID_TABS.includes(queryTab) ? queryTab : "overview";
});
```

This makes tabs deep-linkable and back-button friendly.

### Confirmation Dialogs

Use `DialogAction` from `@/components/shared/dialog-action`:
```tsx
<DialogAction
    title={`Deploy all ${count} services?`}
    description="This will trigger..."
    type="default"
    onClick={handler}
>
    <Button>Deploy all {count}</Button>
</DialogAction>
```

---

## 8. Common Issues & Fixes

### ERR_MODULE_NOT_FOUND (Server Crash)

**Cause**: Copied the wrong dist file to `compose.js` or `services-compose.js`.

**Fix**:
```bash
# compose.js MUST come from utils/builders/:
cp packages/server/dist/utils/builders/compose.js ./compose.js

# services-compose.js MUST come from services/:
cp packages/server/dist/services/compose.js ./services-compose.js
```

### Next.js Build Hangs / Fails

**Cause**: Google Fonts (`next/font/google`) is network-blocked.

**Fix**: Install `@fontsource/inter` and swap `_app.tsx`:
```bash
pnpm --filter dokploy add @fontsource/inter
```
Edit `apps/dokploy/pages/_app.tsx` — replace `next/font/google` with CSS imports.

### `switchToDist.js` Modified package.json

**Cause**: Server build script rewrites `packages/server/package.json` main field.

**Fix**:
```bash
git checkout packages/server/package.json
```
Always do this after `pnpm --filter @dokploy/server run build`.

### Stale Chunks After Rebuild

**Fix**: Clear the Next.js cache:
```bash
rd /s /q apps\dokploy\.next\cache
```

### Docker Build Timeout

**Cause**: `docker build` can take 5+ minutes on Windows with Docker Desktop.

**Fix**: Use `docker cp` instead (Method B above) for frontend-only changes.

### `noUncheckedIndexedAccess`

`array[0]` returns `T | undefined`. Always guard:
```tsx
const primary = arr.find(d => d.enabled) || arr[0];
if (!primary) return null;
```

### PowerShell Git Push Error

The `git push` stderr triggers PowerShell's `NativeCommandError`. This is cosmetic —
the push succeeds. The output shows `old..new branch -> branch` confirming success.

---

## 9. Local-Only Files (Never Commit)

These files exist locally but should NEVER be committed:

| File | Purpose |
|------|---------|
| `Dockerfile.patch` | Overlay image definition |
| `docker-compose.test.yml` | Local test stack |
| `compose.js` | Copied from server dist (builders) |
| `services-compose.js` | Copied from server dist (services) |
| `.env.production` | Root env for Docker build |
| `.env.production.local` | Root env for docker-compose |
| `apps/dokploy/.env` | Frontend env |
| `apps/dokploy/package.json` | Modified with `@fontsource/inter` (revert before commit) |
| `apps/dokploy/pages/_app.tsx` | Font workaround swap (revert before commit) |

### Pre-Commit Checklist

```bash
# 1. Revert server package.json (if server was built)
git checkout packages/server/package.json

# 2. Revert _app.tsx (if font workaround is active)
#    (manually swap back to next/font/google, or stash it)

# 3. Revert apps/dokploy/package.json (remove @fontsource/inter)
git checkout apps/dokploy/package.json

# 4. Verify no local-only files staged
git status

# 5. Typecheck
pnpm --filter dokploy run typecheck
```

---

## 10. Commit History

### `feat/project-control-center` branch

```
7fab4c0c8 fix(env): address UX roast — operational clarity over feature density
2fed41a59 feat: add production environment configuration and Dockerfile updates
f159c30e2 feat(compose): redesign service details into Overview/Deployments/Logs/Configuration
82e122270 feat(project): full control-center redesign - overview, logs, configuration tabs
58ed6dc3e feat(project): deployments timeline and monitoring views in environment
43e716d1f Merge remote-tracking branch 'origin/feat/compose-auto-rollback'
137f45603 feat(project): project health overview with real container runtime status
```

### `feat/compose-auto-rollback` branch (merged in)

```
5b59b57ef fix(compose): abort deploy when the pre-change snapshot cannot be copied
ed0627870 fix(compose): require env restore for env-generating services
679a60082 fix(compose): bind rollback marker to deployment id, gate on env restore
651eff0f0 fix(compose): anchor rollback marker, don't gate on optional env restore
e1c2c2d34 fix(compose): only emit rollback marker after files are actually restored
0e19a10db fix(compose): address review - marker-only rollback, rebuild snapshot
de9040c7b feat(compose): redesign service header card
309a72583 feat(compose): move status flags right, list service urls under name
```

---

## What We Built (Feature Summary)

### 1. Transactional Compose Deploys (PR #5182)

- **Snapshot before deploy**: `backupCurrentDeployment()` copies the working compose
  files to a timestamped backup before any changes are applied.
- **Auto-rollback on failure**: If `docker compose up` fails, `restoreCommands()`
  restores the snapshot and marks the deployment as rolled back.
- **Last-good persistence**: `persistLastGood()` saves the last successful compose
  config so it can be restored even after a partial failure.
- **Status flags**: Green (done), Red (failed + rolled back), Amber (deploying).

Files: `packages/server/src/services/compose.ts`, `packages/server/src/utils/builders/compose.ts`

### 2. Project Health Backend

- **`getProjectHealth(projectId)`**: Aggregates all environments and services for a
  project, queries container runtime status via `docker.getContainers()`, derives
  health state (healthy/degraded/failed/unknown), returns container counts, domains,
  git info, and last deployment per service.
- **`getAllProjectsHealth()`**: Same but for all projects (used by projects list).
- **One `docker ps` per server**: Efficient — doesn't hammer Docker API.

Files: `packages/server/src/services/project-health.ts`, `packages/server/src/index.ts`
Router: `apps/dokploy/server/api/routers/project.ts`

### 3. Environment Page — 6-Tab Control Center

Tabs: **Overview** | **Services** | **Deployments** | **Logs** | **Monitoring** | **Configuration**

- URL-backed (`?tab=overview`), deep-linkable, back-button friendly.
- Health strip always visible above tabs (status pill, container/domain/deploy stats,
  Deploy all with confirmation dialog).
- **Overview**: Stat tiles, service list with runtime dots, recent deployments.
- **Services**: Compact cards with type badge, runtime badge, collapsed domains,
  git info. Bulk actions hidden until selection. Default sort: Name A-Z.
- **Deployments**: Merged timeline across all services, All/Errors filter.
- **Logs**: Service→container picker, live 5s polling, searchable.
- **Monitoring**: Per-service CPU/Memory table, 15s refresh, unavailable state.
- **Configuration**: Domains, env vars dialog, schedules, per-service config links.

File: `apps/dokploy/pages/dashboard/project/[projectId]/environment/[environmentId].tsx`
Components: `apps/dokploy/components/dashboard/project/project-*.tsx`

### 4. Compose Service Details — 4 Primary Tabs

Tabs: **Overview** | **Deployments** | **Logs** | **Configuration**

- **Overview**: Runtime badge, Deploy/Restart quick actions, Information card
  (server, type, containers, last deployment, git, domains), Resources card
  (real CPU/Memory from monitoring, container status chips).
- **Configuration**: Groups 10 sub-sections (General, Environment, Domains, Containers,
  Backups, Schedules, Volume Backups, Patches, Monitoring, Advanced) under sub-tabs.

Files: `apps/dokploy/pages/.../services/compose/[composeId].tsx`,
`apps/dokploy/components/dashboard/compose/compose-overview.tsx`,
`apps/dokploy/components/dashboard/compose/compose-configuration-tabs.tsx`

### 5. Projects List — Portfolio Cards

- `project.healthAll` query
- Per-project health pill + counters + service initials chips + server line

File: `apps/dokploy/components/dashboard/projects/show.tsx`

### 6. UX Roast Fixes

- Pluralization (1 service / 2 services)
- ServiceRuntimeDot: badge with text label (not a 2.5px dot)
- Default sort: Name A-Z (stable, non-jumpy)
- Bulk actions: hidden until selection
- Deploy all: confirmation dialog with explicit scope
- Domains: collapsed to primary + "+N domains"
- Removed "Created" timestamp from card footer
- Server line: hidden for local Dokploy server
- Type badge: text label (Docker Compose, PostgreSQL, etc.)
- Card spacing: tightened

---

## Quick Reference Commands

```bash
# ── Typecheck ──
pnpm --filter dokploy run typecheck

# ── Build Server (backend changed) ──
pnpm --filter @dokploy/server run build
git checkout packages/server/package.json          # REVERT
cp packages/server/dist/utils/builders/compose.js ./compose.js
cp packages/server/dist/services/compose.js ./services-compose.js

# ── Build Server Bundle (always, fast) ──
pnpm --filter dokploy run build-server

# ── Build Next.js (always, slow) ──
$env:NODE_OPTIONS='--dns-result-order=ipv4first'
pnpm --filter=./apps/dokploy run build

# ── Deploy: Fast (frontend-only) ──
docker cp apps/dokploy/.next dokploy-test:/app/.next
docker restart dokploy-test

# ── Deploy: Full (backend changed) ──
docker build -f Dockerfile.patch -t dokploy-local:patch .
docker compose -f docker-compose.test.yml up -d

# ── Verify ──
docker inspect dokploy-test --format "{{.State.Health.Status}}"
docker exec dokploy-test sh -c "grep -rlo 'SEARCH_STRING' /app/.next/static/chunks/ 2>/dev/null"

# ── Commit ──
git add <files>
git commit -m "feat(scope): description"
git push

# ── Git Log ──
git log --oneline -10
```

---

## 11. Production Deployment (Swarm)

Production runs on `server.aboalia.com` — a Proxmox Ubuntu VM with Docker Swarm.
SSH is NOT reachable; all server changes go through the **Proxmox web console**.

### Production Layout

| Container | Image | Role |
|-----------|-------|------|
| `dokploy.1.<task>` | `dokploy/dokploy:v0.30.2` | Main app (swarm service) |
| `dokploy-postgres.1.<task>` | `postgres:16` | Database |
| `dokploy-traefik` | `traefik:v3.6.7` | Reverse proxy |

### Why `docker cp` Doesn't Work for Swarm

Swarm replaces the task container on restart. Any filesystem changes made via
`docker cp` into a running task are **lost** when the task is recreated from
the original image. You must build a proper image and update the service.

### Deployment Flow

See **[DEPLOY.md](./DEPLOY.md)** for the full checklist.

Summary:
1. Build `.next` + `dist` locally
2. Package as tarball with `deploy.sh`
3. Create GitHub release on `EngAbo3lia/dokploy`
4. Paste 3 commands into Proxmox console:
   ```bash
   curl -fL -o /tmp/cc.tgz https://github.com/EngAbo3lia/dokploy/releases/download/cc-v0.30.2-rN/dokploy-cc.tar.gz
   rm -rf /tmp/cc && mkdir -p /tmp/cc && tar -xzf /tmp/cc.tgz -C /tmp/cc
   bash /tmp/cc/deploy.sh
   ```
5. `deploy.sh` on the server:
   - Backs up postgres
   - Extracts `.next` / `dist` / overlays into build context
   - Writes Dockerfile (`FROM dokploy/dokploy:v0.30.2` + COPY)
   - `docker build -t dokploy-cc:v0.30.2-ccN .`
   - `docker service update --update-order stop-first --image dokploy-cc:... dokploy`
   - Health polls → auto-rollback on failure

### Critical: `--update-order stop-first`

Swarm defaults to `start-first` ordering for service updates. This means it tries
to start the new task while the old task still holds port 3000. Result:
```
Bind for 0.0.0.0:3000 failed: port is already allocated
```

**Always** use `--update-order stop-first`:
```bash
docker service update --detach=false --update-order stop-first \
  --image dokploy-cc:v0.30.2-ccN dokploy
```

### Rollback

```bash
# Restore stock v0.30.2
docker service update --detach=false --update-order stop-first \
  --image "dokploy/dokploy:v0.30.2@sha256:98d9471d6152b3fdb2ecd1124b180ec0cb525586ed4186580069fdd3e8f9f482" \
  dokploy
```

### Version Pinning

The production image tag is `dokploy-cc:v0.30.2-ccN`. Increment `N` each deploy
so swarm detects the change. If official Dokploy upgrades to a new version,
rebuild against the new base image and update the `BASE_IMAGE` reference.
