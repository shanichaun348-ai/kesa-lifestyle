#!/usr/bin/env bash
# Build and (re)start the site on the server. Safe to run repeatedly.
#
#   cd /opt/kesa-lifestyle && ./deploy/deploy.sh            # deploy whatever is checked out
#   ./deploy/deploy.sh --pull                               # fetch main first
#
# The previous image keeps running until the new one is healthy; compose then
# swaps containers, so a failed build never takes the site down.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=deploy/.env.production
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE — copy deploy/.env.production.example and fill it in." >&2; exit 1; }
grep -q '^CRON_SECRET=.\{16,\}' "$ENV_FILE" || { echo "CRON_SECRET in $ENV_FILE must be at least 16 characters." >&2; exit 1; }

if [ "${1:-}" = "--pull" ]; then
  git fetch --quiet origin main
  git reset --hard origin/main --quiet
fi

# compose reads interpolation values (SITE_DOMAIN, CRON_SECRET…) from the environment.
set -a; # shellcheck disable=SC1090
source "$ENV_FILE"; set +a
export APP_COMMIT_SHA="$(git rev-parse HEAD)"
export DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1

echo "Building $APP_COMMIT_SHA…"
docker compose build --pull app
echo "Starting…"
docker compose up -d --remove-orphans

echo "Waiting for health…"
for i in $(seq 1 30); do
  if docker compose exec -T app curl -fsS http://127.0.0.1:3000/api/health/ > /dev/null 2>&1; then
    echo "Healthy. Live commit: $(docker compose exec -T app curl -fsS http://127.0.0.1:3000/api/health/ | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p')"
    docker image prune -f > /dev/null
    exit 0
  fi
  sleep 5
done
echo "App did not become healthy — check: docker compose logs --tail=200 app" >&2
exit 1
