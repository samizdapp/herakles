#!/bin/bash
touch /shared_etc/hosts
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
    jq '.AdminListen = "tcp://localhost:9001"' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
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
    echo "SOMETHING FUCKED UP, WE SHOULD HAVE A REAL BACKUP $CONF"
    cp $CONF $CONF_BACKUP
  else 
    echo "restore $CONF_BACKUP"
    cp $CONF_BACKUP $CONF
    jq '.AdminListen = "tcp://localhost:9001"' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
  fi
  jq '.AdminListen = "tcp://localhost:9001"' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
fi


send_status "yggdrasil" "WAITING" "Starting up."

PEERS=$(cat /etc/yggdrasil-network/config.conf  | jq .Peers)

# if no peers, add default
if [ "$PEERS" == "[]" ]; then
  echo "no peers, add default"
  jq '.Peers = ["tls://51.38.64.12:28395"]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
fi

# disable multicast, listen for crawler on localhost, add nodeinfo, listen on all interfaces
jq '.MulticastInterfaces = [  ]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
jq '.NodeInfo = { "samizdapp": { "groups": ["caddy", "pleroma", "yggdrasil"] } }' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
jq '.Listen = ["tcp://0.0.0.0:5000"]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"

/usr/bin/run.sh & jobs

CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
while inotifywait -e close_write $CONF; 
do
    echo "detected yggdrasil config change, restart container"
    exit
done
