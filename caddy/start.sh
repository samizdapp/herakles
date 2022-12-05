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

CF=/etc/caddy/Caddyfile


cat Caddyfile.header > $CF
echo "$PLEROMA {" >> $CF
echo "  reverse_proxy localhost:8009" >> $CF
echo "}" >> $CF
echo "$CADDY {" >> $CF
echo "  file_server browse {" >> $CF
echo "    root /data/caddy/" >> $CF
echo "  }" >> $CF
echo "}" >> $CF
echo "$YGGDRASIL {" >> $CF
echo "  file_server {" >> $CF
echo "    root /yggdrasil/" >> $CF
echo "  }" >> $CF
echo "}" >> $CF
echo "http://samizdapp.localhost, http://localhost, http://$MDNS_TLD {" >> $CF
cat Caddyfile.footer >> $CF

caddy run --config /etc/caddy/Caddyfile --adapter caddyfile