#!/usr/bin/env sh

set -e

CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
CONF_BACKUP="$CONF_DIR/backup.conf"
tmp=$(mktemp)
mkdir -p /shared_etc

SIZERES=$(wc -c $CONF)
SIZE=${SIZERES:0:1}
if [ $SIZE == '0' ]; then
  echo "configuration file is empty, restore from backup"
  rm $CONF
fi

if [ ! -f $CONF ]; then
  if [ ! -f $CONF_BACKUP ]; then
    echo "generate $CONF"
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


# /usr/bin/upnp.sh & jobs
# /usr/bin/watch.sh & jobs
# /crawler/watch.sh & jobs
/usr/bin/restart.sh & jobs
yggdrasil --useconf -json < "$CONF_DIR/config.conf"
exit $?
