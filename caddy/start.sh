#!/bin/sh

while [ ! -f /etc/yggdrasil-network/backup.conf ]
do
echo "waiting for yggdrasil config"
sleep 1
done

echo "get public key"
PUB=$(jq '.PublicKey' /etc/yggdrasil-network/backup.conf | tr -d '"')
echo $PUB
P1=${PUB:0:63}
P2=${PUB:63:1}
echo $PUB
export PLEROMA="pleroma.$P1.$P2.yg"
echo $PLEROMA
export CADDY="caddy.$P1.$P2.yg"
export YGGDRASIL="yggdrasil.$P1.$P2.yg"

YGGDRASIL_TLD="$P1.$P2.yg"

echo "{\"YGGDRASIL_TLD\" : \"$YGGDRASIL_TLD\", \"MDNS_TLD\" : \"$MDNS_TLD\", \"ROOT_APP_PORT\": \"$ROOT_APP_PORT\" }" > frontmatter.yaml

mustache frontmatter.yaml Caddyfile.mustache > /etc/caddy/Caddyfile

caddy run --config /etc/caddy/Caddyfile --adapter caddyfile & jobs

sleep 2000