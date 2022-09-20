#!/usr/bin/env sh

set -e

CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
CONF_BACKUP="$CONF_DIR/backup.conf"
tmp=$(mktemp)
mkdir -p /shared_etc

if [ -s $CONF ]; then
  rm $CONF
fi

if [ ! -f $CONF ]; then
  echo "generate $CONF"
  if [ ! -f $CONF_BACKUP ]; then
    yggdrasil --genconf -json > "$CONF"
    cp $CONF $CONF_BACKUP
  else 
    cp $CONF_BACKUP $CONF
  fi
fi
jq '.NodeInfo = { "samizdapp": { "groups": ["caddy", "pleroma", "yggdrasil"] } }' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
jq '.AdminListen = "tcp://localhost:9001"' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
# jq '.Peers = [  ]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
jq '.Peers = ["tls://51.38.64.12:28395"]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"
jq '.Listen = ["tcp://0.0.0.0:5000"]' "$CONF" > "$tmp" && mv "$tmp" "$CONF"


# /usr/bin/upnp.sh & jobs
# /usr/bin/watch.sh & jobs
# /crawler/watch.sh & jobs
yggdrasil --useconf -json < "$CONF_DIR/config.conf"
exit $?
