# Production Deployment Checklist

Current production image: `aboalia/dokploy:aboalia` (built by CI from `aboalia` branch) — **LIVE since 2026-08-27**
Rollback image: `dokploy-cc:v0.30.2-cc2` (previous custom build, kept on node) / `dokploy/dokploy:v0.30.2` (stock)
Server: `server.aboalia.com` (Proxmox, Ubuntu 24.04, Docker Swarm)

**Deployment type**: bare `docker service create` (service name `dokploy`) — NO stack, NO compose file on disk.

---

## New Release Pipeline (CI)

1. Merge features into `aboalia` → push → GitHub Actions builds/pushes `aboalia/dokploy:<tag>`
2. On the Proxmox VM console, patch the running swarm service (below)

---

## Patch Production (Proxmox console) — VERIFIED

```bash
# 1. Inspect current deployment
docker service ls --format "table {{.Name}}\t{{.Image}}\t{{.Replicas}}" | grep dokploy

# 2. Patch in place (rolling update, stop-first REQUIRED for port 3000)
docker pull aboalia/dokploy:aboalia
docker service update --image aboalia/dokploy:aboalia --update-order stop-first --force dokploy

# 3. Verify
docker service ps dokploy --format "table {{.Name}}\t{{.Image}}\t{{.TaskState}}\t{{.CurrentState}}"
docker service logs dokploy --tail 50 --since 2m
```

Notes:
- Service name is **`dokploy`**, not `dokploy_dokploy` (bare service create, no stack)
- No compose file exists (`/etc/dokploy/docker-compose.yml` absent) — `service update` IS the deployment; nothing persists on disk
- **`--update-order stop-first` is REQUIRED** — default `start-first` causes port 3000 conflict with the still-running old task
- Data volumes and env in the service spec are untouched (image swap only) — drop-in replacement
- The aboalia image is a multi-arch manifest (amd64 + arm64); `docker pull` must succeed on every swarm node

---

## Deployment Log

| # | Image | Date | Status | Notes |
|---|-------|------|--------|-------|
| — | stock `dokploy/dokploy:v0.30.2` | — | baseline | official image |
| cc2 | `dokploy-cc:v0.30.2-cc2` | 2026-08-25 | was running | earlier cc patch build (local tar approach) |
| aboalia | `aboalia/dokploy:aboalia` | 2026-08-27 | **LIVE** | CI build (Node 24), rolling update — verified working |

---

## Rollback (if production breaks)

```bash
docker service update --detach=false --update-order stop-first \
  --image "dokploy-cc:v0.30.2-cc2" dokploy
```

---

## Local Development

```bash
# Local test stack (dokploy + postgres + redis + traefik):
docker compose -f docker-compose.test.yml up -d

# Local patch image (for fast dev iteration; NOT for production):
docker build -f Dockerfile.patch -t dokploy-local:patch .
```

---

## Verification After Deploy

1. Open `https://dokploy.aboalia.com` — should load without errors
2. Navigate to test-cycle-8 → production environment
3. Check: card header (icon + env badge + description on one row, buttons inline), services grid, filters
4. Check: Overview tab works, Deployments timeline populates
5. Check: Compose service page renders correctly

---

## Notes

- **Repo ownership**: `aboalia` is our primary branch (GitHub default). `upstream` remote = `Dokploy/dokploy`; sync with `scripts/sync-upstream.sh`, then merge into `aboalia` with conflict resolution.
- **CI**: `.github/workflows/build-aboalia.yml` builds on push to `aboalia` (tag `aboalia`), tags `v*` (tag `latest` + `vX.Y.Z`), and manual dispatch. Secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.
- **Docker Hub**: `aboalia/dokploy:aboalia` (multi-arch manifest: amd64 + arm64)
- Node 24.4.0 build in CI = matching container runtime (avoids local Node 22 → 24 mismatch crash)
