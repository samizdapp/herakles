#!/bin/bash

send_status () {
  SERVICE="$1"
  STATUS="$2"
  MESSAGE="$3"
  curl \
    -w "\n" \
    -d "{\"service\": \"$SERVICE\", \"status\": \"$STATUS\", \"message\": \"$MESSAGE\"}" -H "Content-Type: application/json" \
    -X POST http://localhost/api/status/logs \
    || true
}
