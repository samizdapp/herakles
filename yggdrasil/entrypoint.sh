#!/usr/bin/env bash

source /usr/bin/status.sh

CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
CONF_BACKUP="$CONF_DIR/backup.conf"
tmp=$(mktemp)

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

yggdrasil --useconf -json < $CONF | while read LOG; do
  echo "$LOG"
  handle_log "$LOG" &
done

RET="${PIPESTATUS[0]}"

if [ $RET -ne 0 ]; then
    send_status "yggdrasil" "OFFLINE" "Exited ($RET)"
fi

# reste connected logs so that any connected loops stop
CONNECTED_LOGS=()

exit $RET
