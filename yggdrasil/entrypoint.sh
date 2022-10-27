#!/usr/bin/env bash

send_status () {
  STATUS="$1"
  MESSAGE="$2"
  curl \
    -d "{\"service\": \"yggdrasil\", \"status\": \"$STATUS\", \"message\": \"$MESSAGE\"}" -H "Content-Type: application/json"\
    -X POST http://localhost/api/status/logs
}

handle_log () {
  LOG="$1"
  if [[ "$LOG" =~ "Startup complete" ]]; then
    send_status "WAITING" "$LOG"
  elif [[ "$LOG" =~ Connected.*source ]]; then
    send_status "ONLINE" "$LOG"
    sleep 30
    while [ -z "${RET}" ]; do
      send_status "ONLINE" "$LOG"
      sleep 30
    done
  fi
}

set -e

CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
CONF_BACKUP="$CONF_DIR/backup.conf"
tmp=$(mktemp)
mkdir -p /shared_etc/yggdrasil-network

send_status "WAITING" "Generating config."

if ! test -f "$CONF"; then
    echo "generate init $CONF"
    yggdrasil --genconf -json > "$CONF"
    cp $CONF $CONF_BACKUP
fi

SIZERES=$(wc -c $CONF)
SIZE=${SIZERES:0:1}
if [ $SIZE == '0' ]; then
  echo "configuration file is empty, restore from backup"
  rm $CONF
fi

if [ ! -f $CONF ]; then
  if [ ! -f $CONF_BACKUP ]; then
    echo "generate recover $CONF"
    yggdrasil --genconf -json > "$CONF"
    cp $CONF $CONF_BACKUP
  else 
    echo "restore $CONF_BACKUP"
    cp $CONF_BACKUP $CONF
  fi
fi
jq '.NodeInfo = { "samizdapp": { "groups": ["caddy", "pleroma", "yggdrasil"] } }' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
jq '.AdminListen = "tcp://localhost:9001"' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
# jq '.Peers = [  ]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
jq '.Peers = ["tls://51.38.64.12:28395"]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
jq '.Listen = ["tcp://0.0.0.0:5000"]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"

send_status "WAITING" "Starting up."

# /usr/bin/upnp.sh & jobs
# /usr/bin/watch.sh & jobs
# /crawler/watch.sh & jobs
/usr/bin/restart.sh & jobs

yggdrasil --useconf -json < $CONF | while read LOG; do
  handle_log "$LOG" &
  echo "$LOG"
done

RET="${PIPESTATUS[0]}"

if [ $RET -ne 0 ]; then
    send_status "OFFLINE" "Exited ($RET)"
fi

exit $RET
