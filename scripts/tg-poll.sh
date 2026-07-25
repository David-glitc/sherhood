#!/usr/bin/env bash
# Poll Sherhood TG broadcast endpoint (use with cron-job.org / crontab every 1–2 min).
# Usage:
#   export SITE_URL=https://sherhood.xyz
#   export CRON_SECRET=...
#   ./scripts/tg-poll.sh

set -euo pipefail
SITE="${SITE_URL:-https://sherhood.xyz}"
SECRET="${CRON_SECRET:?set CRON_SECRET}"
curl -sS -H "Authorization: Bearer ${SECRET}" "${SITE}/api/cron/tg-broadcast" | python3 -m json.tool
