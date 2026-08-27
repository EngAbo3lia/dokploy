# Production Deployment Checklist

Current production image: `aboalia/dokploy:aboalia` (built by CI from `aboalia` branch)
Rollback image: `dokploy/dokploy:v0.30.2` (stock, previously running)
Server: `server.aboalia.com` (Proxmox, Ubuntu 24.04, Docker Swarm)

---

## New Release Pipeline (CI)

1. Merge features into `aboalia` → push → GitHub Actions builds/pushes `aboalia/dokploy:<tag>`
2. On the Proxmox VM console, patch the running swarm service (below)

---

## Patch Production (Proxmox console)

Paste into Proxmox VM console (SSH not reachable — use web console):

```bash
# 1. Inspect current deployment
docker service ls --format "table {{.Name}}\t{{.Image}}\t{{.Replicas}}" | grep dokploy
grep -r "image:" /etc/dokploy/docker-compose.yml

# 2. Pull our image + patch in place (rolling update, no downtime)
docker pull aboalia/dokploy:aboalia
docker service update --image aboalia/dokploy:aboalia --update-order stop-first --force dokploy_dokploy

# 3. Persist the change in the compose file (so install.sh re-deploys won't revert to dokploy org image)
cp /etc/dokploy/docker-compose.yml /etc/dokploy/docker-compose.yml.bak
sed -i 's#image: dokploy/dokploy:.*#image: aboalia/dokploy:aboalia#' /etc/dokploy/docker-compose.yml

# 4. Verify
docker service ps dokploy_dokploy --format "table {{.Name}}\t{{.Image}}\t{{.TaskState}}\t{{.CurrentState}}"
docker service logs dokploy_dokploy --tail 50
```

Notes:
- Service name is usually `dokploy_dokploy` (stack: `dokploy`) — confirm with step 1, adapt if different
- **`--update-order stop-first` is REQUIRED** — default `start-first` causes port 3000 conflict with the still-running old task
- Data (Postgres volumes, `/etc/dokploy`) is untouched — the `aboalia` image is built from the same `Dockerfile`/compose contract, so it's a drop-in replacement
- If using `docker stack deploy` instead: run step 3 first, then `docker stack deploy --compose-file /etc/dokploy/docker-compose.yml dokploy`

---

## Rollback (if production breaks)

```bash
docker service update --detach=false --update-order stop-first \
  --image dokploy/dokploy:v0.30.2 dokploy_dokploy
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
