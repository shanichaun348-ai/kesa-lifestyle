#!/usr/bin/env bash
# Deploy the latest main to a pm2-managed server (Next.js standalone output).
#
# Usage, on the server:
#   cd /var/www/html/kesa-lifestyle && ./scripts/deploy.sh
#
# Expects: git checkout of the repo, Node 22, pnpm 10, a `.env.local` in the
# project root with the production values, and a pm2 process named
# `kesa-lifestyle` running `.next/standalone/server.js`.
set -euo pipefail

APP_NAME="${APP_NAME:-kesa-lifestyle}"
STANDALONE=".next/standalone"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

if [ "${1:-}" != "--no-pull" ]; then
  echo "→ Pulling origin/main…"
  git fetch --quiet origin main
  git reset --hard origin/main --quiet
fi
export APP_COMMIT_SHA="$(git rev-parse HEAD)"
echo "→ Building $APP_COMMIT_SHA…"

pnpm install --frozen-lockfile
rm -rf .next/types .next/dev/types
pnpm build

echo "→ Copying public assets and static chunks into standalone…"
mkdir -p "$STANDALONE/public" "$STANDALONE/.next/static"
cp -r public/. "$STANDALONE/public/"
cp -r .next/static/. "$STANDALONE/.next/static/"

echo "→ Copying env into standalone…"
cp .env.local "$STANDALONE/.env.local"
# The health endpoint reports this commit; the deploy workflow verifies it.
grep -v '^APP_COMMIT_SHA=' "$STANDALONE/.env.local" > "$STANDALONE/.env.local.tmp" || true
printf 'APP_COMMIT_SHA=%s\n' "$APP_COMMIT_SHA" >> "$STANDALONE/.env.local.tmp"
mv "$STANDALONE/.env.local.tmp" "$STANDALONE/.env.local"

echo "→ Restarting pm2 process $APP_NAME…"
pm2 restart "$APP_NAME" --update-env

echo "✓ Deployed $APP_COMMIT_SHA"
