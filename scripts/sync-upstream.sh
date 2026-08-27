#!/usr/bin/env bash
# Sync upstream Dokploy canary into our aboalia branch.
#
# Strategy (per aboalia repo model):
#   - We never overwrite aboalia with upstream. We PULL upstream canary into
#     a dedicated sync branch, then merge it into aboalia, resolving conflicts.
#   - After a clean merge + tests, push aboalia. CI builds aboalia/dokploy.
#
# Usage:
#   ./scripts/sync-upstream.sh [opts]
#     --no-fetch   skip fetching upstream (use existing refs)
#     --push       push aboalia to origin after merge
#
# Requirements: git, gh (for optional PR creation)

set -euo pipefail

UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/Dokploy/dokploy.git}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-canary}"
SYNC_BRANCH="sync/upstream-${UPSTREAM_BRANCH}"
TARGET_BRANCH="${TARGET_BRANCH:-aboalia}"

FETCH=1
PUSH=0

for arg in "$@"; do
  case "$arg" in
    --no-fetch) FETCH=0 ;;
    --push) PUSH=1 ;;
  esac
done

echo "==> Ensuring 'upstream' remote exists"
git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "$UPSTREAM_URL"
git remote set-url upstream "$UPSTREAM_URL"
git fetch upstream "$UPSTREAM_BRANCH"

echo "==> Moving to $TARGET_BRANCH (preserves our customizations)"
git checkout "$TARGET_BRANCH"
git pull origin "$TARGET_BRANCH" --ff-only

echo "==> Creating/updating sync branch $SYNC_BRANCH from upstream"
git checkout -B "$SYNC_BRANCH" "upstream/$UPSTREAM_BRANCH"
echo "    Sync branch is now at upstream/$UPSTREAM_BRANCH"

echo "==> Merging upstream into $TARGET_BRANCH"
git checkout "$TARGET_BRANCH"
if git merge "$SYNC_BRANCH" -m "merge: sync upstream ${UPSTREAM_BRANCH} into ${TARGET_BRANCH}"; then
  echo "    Merge clean."
else
  echo "!! Merge conflicts. Resolve them, then run:"
  echo "   git add . && git commit -m 'merge: resolve upstream ${UPSTREAM_BRANCH} conflicts'"
  echo "   ./scripts/sync-upstream.sh --push"
  exit 1
fi

if [ "$PUSH" = "1" ]; then
  echo "==> Pushing $TARGET_BRANCH (CI will build aboalia/dokploy)"
  git push origin "$TARGET_BRANCH"
else
  echo "==> Done. Review changes with 'git log --oneline origin/$TARGET_BRANCH..HEAD'"
  echo "    When ready, push to build a release: git push origin $TARGET_BRANCH"
fi
