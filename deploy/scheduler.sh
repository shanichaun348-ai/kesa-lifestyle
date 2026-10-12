#!/bin/sh
# Calls the app's job routes on a schedule from inside the compose network.
#   every hour        /api/jobs/abandoned-carts/
#   daily at 03:00 UTC (08:30 IST)  /api/jobs/release-stale-reservations/ and /api/jobs/reconcile-payments/
# Authenticated with CRON_SECRET, exactly like Vercel Cron / GitHub Actions.
set -u

call() {
  path="$1"
  code=$(curl -s -o /tmp/out --max-time 120 -w '%{http_code}' -H "Authorization: Bearer $CRON_SECRET" "$APP_URL$path" || echo 000)
  echo "$(date -u +%FT%TZ) $code $path $(head -c 200 /tmp/out)"
}

# Wait for the app to be reachable.
until curl -fsS --max-time 5 "$APP_URL/api/health/" > /dev/null 2>&1; do sleep 5; done
echo "$(date -u +%FT%TZ) scheduler started"

while true; do
  call /api/jobs/abandoned-carts/
  if [ "$(date -u +%H)" = "03" ]; then
    call /api/jobs/release-stale-reservations/
    call /api/jobs/reconcile-payments/
  fi
  # Sleep until the top of the next hour.
  sleep $(( 3600 - $(date -u +%s) % 3600 ))
done
