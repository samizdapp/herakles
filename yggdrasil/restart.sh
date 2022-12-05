#!/bin/bash

source /usr/bin/status.sh

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



/usr/bin/entrypoint.sh & jobs

CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
while inotifywait -e close_write $CONF; 
do
    echo "detected yggdrasil config change, restart container"
    exit
done