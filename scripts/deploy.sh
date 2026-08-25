#!/usr/bin/env bash
# Dokploy Control-Center deploy — SWARM-NATIVE edition (v3)
# Builds a patched image ON THE SERVER from uploaded artifacts,
# then hands it to the swarm service update mechanism.
# Swarm handles rollout/health itself; rollback = restore previous image ref.
set -uo pipefail

SVC="${SVC:-dokploy}"
BUILD="/tmp/cc/build"
WORK="$(cd "$(dirname "$0")" && pwd)"
TS="$(date +%Y%m%d-%H%M%S)"

log()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m !!\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m ok\033[0m %s\n' "$*"; }

docker service inspect "$SVC" >/dev/null 2>&1 || { warn "service '$SVC' not found"; exit 1; }

OLDIMG="$(docker service inspect "$SVC" --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}')"
CURTAG="${NEW_TAG:-dokploy-cc:v0.30.2-cc2}"
BASEVER="$(echo "$OLDIMG" | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"
BASEVER="${BASEVER:-v0.30.2}"

log "service=$SVC"
echo "    current image : $OLDIMG"
echo "    will build    : $CURTAG (FROM dokploy/dokploy:$BASEVER)"
printf 'Proceed? [y/N] '; read -r OKT
[ "$OKT" = "y" ] || { echo "aborted"; exit 1; }

PG="$(docker ps --filter "name=${SVC}-postgres" --format '{{.Names}}' | head -n1)"
if [ -n "$PG" ]; then
    log "Backing up database"
    PGT="$(docker exec "$PG" printenv POSTGRES_USER 2>/dev/null || echo dokploy)"
    if docker exec "$PG" pg_dumpall -U "$PGT" 2>/dev/null | gzip > "$WORK/db-$TS.sql.gz" && [ -s "$WORK/db-$TS.sql.gz" ]; then
        ok "$(du -h "$WORK/db-$TS.sql.gz" | cut -f1) -> $WORK/db-$TS.sql.gz"
    else
        warn "pg_dumpall failed ($PGT) — continuing without fresh backup"
    fi
fi

log "Checking artifacts"
MISS=0
for f in next.tgz dist.tgz font.tgz compose.js services-compose.js server-index.js project-health.js; do
    [ -f "$WORK/$f" ] || { warn "missing $WORK/$f"; MISS=1; }
done
[ "$MISS" = "1" ] && exit 1

log "Preparing build context"
rm -rf "$BUILD"; mkdir -p "$BUILD"
tar -xzf "$WORK/next.tgz"  -C "$BUILD"          # -> $BUILD/.next
tar -xzf "$WORK/dist.tgz"  -C "$BUILD"          # -> $BUILD/dist
mkdir -p "$BUILD/inter"
tar -xzf "$WORK/font.tgz"  -C "$BUILD/inter"    # -> $BUILD/inter/inter ??
if [ -d "$BUILD/inter/inter" ]; then mv "$BUILD/inter/inter" "$BUILD/inter_tmp" && rm -rf "$BUILD/inter" && mv "$BUILD/inter_tmp" "$BUILD/inter"; fi
cp "$WORK/compose.js" "$WORK/services-compose.js" "$WORK/server-index.js" "$WORK/project-health.js" "$BUILD/"
ok "context ready"

cat > "$BUILD/Dockerfile" <<EOF
FROM dokploy/dokploy:$BASEVER
COPY .next /app/.next
COPY dist /app/dist
COPY inter /app/node_modules/@fontsource/inter
COPY compose.js /app/node_modules/@dokploy/server/dist/utils/builders/compose.js
COPY services-compose.js /app/node_modules/@dokploy/server/dist/services/compose.js
COPY server-index.js /app/node_modules/@dokploy/server/dist/index.js
COPY project-health.js /app/node_modules/@dokploy/server/dist/services/project-health.js
EOF

log "Building $CURTAG"
docker build -t "$CURTAG" "$BUILD" || { warn "build failed"; exit 1; }
ok "built"

PREVTASK="$(docker ps --filter "name=${SVC}.1." --format '{{.Names}}' | head -n1)"
log "Updating service -> $CURTAG (previous task: ${PREVTASK:-none})"

task_name() { docker ps --filter "name=${SVC}.1." --format '{{.Names}}' | head -n1; }
task_health() {
    local t="$1" st
    st="$(docker inspect "$t" --format '{{.State.Health.Status}}' 2>/dev/null)"
    echo "${st:-unknown}"
}

log "Waiting for swarm to replace the task"
NEWTASK=""
for i in $(seq 1 24); do
    sleep 5
    T="$(task_name)"
    if [ -n "$T" ] && [ "$T" != "$PREVTASK" ]; then NEWTASK="$T"; break; fi
    printf '    [%02d/24] waiting for new task...\n' "$i"
done
if [ -z "$NEWTASK" ]; then
    warn "no new task appeared — checking service ps:"
    docker service ps "$SVC" --no-trunc | tail -n5
    warn "NOT rolling back automatically (old task may still be serving). Investigate first."
    exit 1
fi
ok "new task: $NEWTASK"

log "Waiting for health (up to 180s)"
HEALTHY=0
for i in $(seq 1 36); do
    sleep 5
    T="$(task_name)"
    ST="$(task_health "$T")"
    printf '    [%02d/36] %s (%s)\n' "$i" "$ST" "$T"
    if [ "$ST" = "healthy" ]; then HEALTHY=1; break; fi
    if [ "$ST" = "unhealthy" ] && [ "$i" -gt 12 ]; then break; fi
done

if [ "$HEALTHY" = "1" ]; then
    cat <<EOF

$(printf '\033[1;32m SUCCESS \033[0m') Control Center deployed via swarm.
  service image : $CURTAG
  rollback      : docker service update --detach=false --image "$OLDIMG" $SVC
  reapply later : re-run this script after any official upgrade
EOF
    exit 0
fi

warn "new task unhealthy — rolling back service to previous image"
docker service update --detach=false --image "$OLDIMG" "$SVC" >/dev/null 2>&1
warn "rolled back to $OLDIMG. Send me:"
echo "    docker service logs --tail 100 $SVC"
exit 1
