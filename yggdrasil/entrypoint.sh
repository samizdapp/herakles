#!/usr/bin/env bash

source /usr/bin/status.sh

CONNECTED_LOGS=()
DISCONNECTED_LOGS=()

handle_log () {
  local LOG="$1"

  if [[ "$LOG" =~ "Startup complete" ]]; then
    send_status "yggdrasil" "WAITING" "$LOG"
  elif [[ "$LOG" =~ Connected.*source ]]; then
    # if this log is not in our existing connected logs
    if [[ ! " ${CONNECTED_LOGS[*]} " =~ " ${LOG} " ]]; then
      # this is a new connection
      CONNECTED_LOGS+=("$LOG")
      # remove any existing disconnection
      DISCONNECT_LOG="${LOG:1}"
      if [[ " ${DISCONNECTED_LOGS[*]} " =~ " ${DISCONNECT_LOG} " ]]; then
        DISCONNECTED_LOGS=("${DISCONNECTED_LOGS[@]/$DISCONNECT_LOG}")
      fi
      # do
      while true; do
        send_status "yggdrasil" "ONLINE" "$LOG"
        sleep 120
        # while the log is in our existing connected logs
        [[ " ${CONNECTED_LOGS[*]} " =~ " ${LOG} " ]] || break
      done
    fi
  elif [[ "$LOG" =~ Disconnected.*source ]]; then
    # if this log is not in our existing disconnected logs
    if [[ ! " ${DISCONNECTED_LOGS[*]} " =~ " ${LOG} " ]]; then
      # this is a new disconnection
      DISCONNECTED_LOGS+=("$LOG")
      # remove any existing connection
      CONNECT_LOG="${LOG:5}"
      if [[ " ${CONNECTED_LOGS[*]} " =~ " ${CONNECT_LOG} " ]]; then
        CONNECTED_LOGS=("${CONNECTED_LOGS[@]/$CONNECT_LOG}")
      fi

      send_status "yggdrasil" "WAITING" "$LOG"
    fi
  fi
}

set -e

CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
CONF_BACKUP="$CONF_DIR/backup.conf"
tmp=$(mktemp)
mkdir -p /shared_etc/yggdrasil-network

send_status "yggdrasil" "WAITING" "Generating config."

if ! test -f "$CONF"; then
    echo "generate init $CONF"
    yggdrasil --genconf -json > "$CONF"
    jq '.NodeInfo = { "samizdapp": { "groups": ["caddy", "pleroma", "yggdrasil"] } }' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
    jq '.AdminListen = "tcp://localhost:9001"' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
    # jq '.Peers = [  ]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
    jq '.Peers = ["tls://51.38.64.12:28395"]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
    jq '.Listen = ["tcp://0.0.0.0:5000"]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
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

jq '.MulticastInterfaces = [  ]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"

send_status "yggdrasil" "WAITING" "Starting up."
jq '.NodeInfo = { "samizdapp": { "groups": ["caddy", "pleroma", "yggdrasil"] } }' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
jq '.AdminListen = "tcp://localhost:9001"' "$CONF" > "$tmp" && mv "$tmp" "$CONF"

jq '.Listen = ["tcp://0.0.0.0:5000"]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"

# /usr/bin/upnp.sh & jobs
# /usr/bin/watch.sh & jobs
# /crawler/watch.sh & jobs
/usr/bin/restart.sh & jobs

yggdrasil --useconf -json < $CONF | while read LOG; do
  echo "$LOG";
  # handle_log "$LOG" &
done

RET="${PIPESTATUS[0]}"

if [ $RET -ne 0 ]; then
    send_status "yggdrasil" "OFFLINE" "Exited ($RET)"
fi

# reste connected logs so that any connected loops stop
CONNECTED_LOGS=()

exit $RET
