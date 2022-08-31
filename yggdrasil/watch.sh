#!/bin/bash
CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
tmp=$(mktemp)

echo "watch hosts"
if [ -f "/shared_etc/yg_hosts" ]
then
echo "found yg_hosts, copying"
cat /shared_etc/yg_hosts > /etc/hosts
fi

mkdir -p /yggdrasil
touch /yggdrasil/peers

while inotifywait -e close_write /shared_etc/yg_hosts; 
do 
  echo "updated, copy yg_hosts"
  cat /shared_etc/yg_hosts > /etc/hosts
  echo "" >> /etc/hosts # need final line end
  PEER_ENDPOINTS="[\"tls://51.38.64.12:28395\",\""
  ALLOWED_KEYS="[\""
  while read p; do
    echo "check $p" 
    if [[ $p == *"yggdrasil."* ]]; then
      echo "found yggdrasil entry"
      parts=($p)
      D="${parts[1]}"
      echo "try parse domain $D $parts"
      IFS='.' read -ra DPARTS <<< $D
      PEER="https://$D/peer"
      KEY="${DPARTS[1]}${DPARTS[2]}"
      echo "got key? $KEY"
      if ! grep -q $KEY "/yggdrasil/peers"; then
        echo "$KEY not found in peers index"
        echo "$PEER"
        ADDR=$(curl --insecure "$PEER")
        echo "$ADDR $KEY" >> /yggdrasil/peers
      fi
    fi
  done < /etc/hosts

  while read l; do
    echo "updating yggdrasil peer config $l"
    PARTS=($l)
    ADDR="${PARTS[0]}"
    KEY="${PARTS[1]}"
    PEER_ENDPOINTS="$PEER_ENDPOINTS$ADDR\",\""
    ALLOWED_KEYS="$ALLOWED_KEYS$KEY\",\""
  done < /yggdrasil/peers
  
  TRIMMED_PEER_ENDPOINTS=${PEER_ENDPOINTS::-2}
  TRIMMED_ALLOWED_KEYS=${ALLOWED_KEYS::-2}
  PEER_ENDPOINTS="$TRIMMED_PEER_ENDPOINTS]"
  ALLOWED_KEYS="$TRIMMED_ALLOWED_KEYS]"


  echo "peer endpoints: $PEER_ENDPOINTS"
  echo "allowed keys: $ALLOWED_KEYS"

  jq ".Peers = $PEER_ENDPOINTS" "$CONF" > "$tmp" 
  jq ".AllowedPublicKeys = $ALLOWED_KEYS" "$CONF" > "$tmp" && mv "$tmp" "$CONF"

done