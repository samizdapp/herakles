#!/usr/bin/env sh

set -e

CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
tmp=$(mktemp)
mkdir -p /shared_etc

if [ ! -f $CONF ]; then
  echo "generate $CONF"
  yggdrasil --genconf -json > "$CONF"

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
