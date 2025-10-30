#!/bin/bash

###############################################################################
# Health Check Script with Alerts
#
# This script checks the application health endpoint and sends alerts
# if the service is down or unhealthy.
#
# Usage:
#   ./health-check.sh
#
# Configuration via environment variables:
#   HEALTH_URL - Health check endpoint URL (default: http://localhost:3000/api/health)
#   SLACK_WEBHOOK_URL - Slack webhook URL for alerts
#   DISCORD_WEBHOOK_URL - Discord webhook URL for alerts
#
# Setup as cron job:
#   * * * * * /path/to/health-check.sh >> /var/log/health-check.log 2>&1
#
# @see docs/monitoring-guide.md
###############################################################################

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

# Perform health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --max-time 10)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check if healthy
if [ "$HTTP_CODE" -ne 200 ]; then
  echo "[$TIMESTAMP] ERROR: Health check failed with HTTP $HTTP_CODE"

  # Send Slack alert
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{
        \"text\": \"🚨 Application Health Check Failed!\",
        \"attachments\": [{
          \"color\": \"danger\",
          \"fields\": [
            {
              \"title\": \"HTTP Status\",
              \"value\": \"$HTTP_CODE\",
              \"short\": true
            },
            {
              \"title\": \"Time\",
              \"value\": \"$TIMESTAMP\",
              \"short\": true
            },
            {
              \"title\": \"URL\",
              \"value\": \"$HEALTH_URL\",
              \"short\": false
            }
          ]
        }]
      }" \
      --max-time 5 \
      2>/dev/null
  fi

  # Send Discord alert
  if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    curl -X POST "$DISCORD_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{
        \"embeds\": [{
          \"title\": \"🚨 Application Health Check Failed\",
          \"description\": \"The application health check returned an error.\",
          \"color\": 15158332,
          \"fields\": [
            {
              \"name\": \"HTTP Status\",
              \"value\": \"$HTTP_CODE\",
              \"inline\": true
            },
            {
              \"name\": \"Time\",
              \"value\": \"$TIMESTAMP\",
              \"inline\": true
            },
            {
              \"name\": \"URL\",
              \"value\": \"$HEALTH_URL\",
              \"inline\": false
            }
          ],
          \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }]
      }" \
      --max-time 5 \
      2>/dev/null
  fi

  exit 1
else
  echo "[$TIMESTAMP] OK: Health check passed (HTTP $HTTP_CODE)"
  exit 0
fi
