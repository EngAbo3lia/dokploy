# Production Deployment Checklist

Current production image: `dokploy-cc:v0.30.2-ccN` (N = latest successful deploy)
Rollback image: `dokploy/dokploy:v0.30.2@sha256:98d9471d6152b3fdb2ecd1124b180ec0cb525586ed4186580069fdd3e8f9f482`
Server: `server.aboalia.com` (Proxmox, Ubuntu 24.04, Docker Swarm)

---

## Quick Deploy (after building + pushing release)

Paste into Proxmox console:

```bash
curl -fL -o /tmp/cc.tgz https://github.com/EngAbo3lia/dokploy/releases/download/cc-v0.30.2-rN/dokploy-cc.tar.gz
rm -rf /tmp/cc && mkdir -p /tmp/cc && tar -xzf /tmp/cc.tgz -C /tmp/cc
bash /tmp/cc/deploy.sh
```

---

## Deployment Log

| # | Tag | Date | Changes | Status | Notes |
|---|-----|------|---------|--------|-------|
| — | stock v0.30.2 | — | baseline (official image) | running | prod baseline |
| r1 | cc-v0.30.2-r1 | 2026-08-25 | first attempt (swarm cp approach) | failed | swarm replaced task on restart, patch lost |
| r2 | cc-v0.30.2-r2 | 2026-08-25 | docker cp + service update | failed | same swarm issue + start-first port conflict |
| r3 | cc-v0.30.2-r3 | 2026-08-25 | docker build on server (swarm-native) | built ok | image built, service update hit port conflict (start-first) |
| r3+fix | — | 2026-08-25 | manual `--update-order stop-first` | pending | user running now |

---

## Build Commands (from repo root)

```bash
# 1. Typecheck
pnpm --filter dokploy run typecheck

# 2. Frontend build
rd /s /q apps\dokploy\.next\cache
$env:NODE_OPTIONS='--dns-result-order=ipv4first'
pnpm --filter=./apps/dokploy run build    # ~5-8 min

# 3. Server bundle
pnpm --filter dokploy run build-server   # ~10s

# 4. Server dist overlays (if backend changed)
pnpm --filter @dokploy/server run build
git checkout packages/server/package.json   # REVERT!
cp packages/server/dist/utils/builders/compose.js ./compose.js
cp packages/server/dist/services/compose.js ./services-compose.js

# 5. Package
$stage = "C:\Users\ahmed\AppData\Local\Temp\opencode\cc-deploy"
tar -czf "$stage\next.tgz" -C apps\dokploy .next
tar -czf "$stage\dist.tgz" -C apps\dokploy dist
tar -czf "$stage\font.tgz" -h -C apps\dokploy\node_modules\@fontsource inter
# Copy overlay .js files to $stage
# Ensure deploy.sh is LF-only
tar -czf "$stage\dokploy-cc.tar.gz" -C $stage deploy.sh next.tgz dist.tgz font.tgz *.js

# 6. Release
gh release create cc-v0.30.2-rN --repo EngAbo3lia/dokploy --target feat/project-control-center \
  --title "Control Center rN" --notes "..." "$stage\dokploy-cc.tar.gz"
```

---

## Rollback (if production breaks)

```bash
# Via Proxmox console:
docker service update --detach=false --update-order stop-first \
  --image "dokploy/dokploy:v0.30.2@sha256:98d9471d6152b3fdb2ecd1124b180ec0cb525586ed4186580069fdd3e8f9f482" dokploy
```

---

## Post-Deploy Verification

1. Open `https://dokploy.aboalia.com` — should load without errors
2. Navigate to SAP Projects → test/production environment
3. Check: health strip visible, services show type labels, cards compact
4. Check: Overview tab works, Deployments timeline populates, Logs load
5. Check: Compose service details → Overview tab with runtime badge + info card

---

## Notes

- **Dockerfile.patch** in repo root is for LOCAL testing only (same logic as deploy.sh on server)
- **deploy.sh** runs ON the server — builds image, updates service, auto-rollbacks on failure
- **Port 3000**: always use `--update-order stop-first` to avoid conflict with still-running old task
- **Image tag**: increment `ccN` each deploy so swarm detects the change
- **@fontsource/inter**: included in tarball for node_modules safety (next/font/google blocked on server)
- **DB backup**: deploy.sh auto-backs up postgres before patching (80KB compressed for our data)
