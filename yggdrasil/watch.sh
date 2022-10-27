#!/bin/bash

source /usr/bin/status.sh

CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
tmp=$(mktemp)

send_status "yggdrasil_watcher" "WAITING" "Starting."

echo "watch hosts"
if [ -f "/shared_etc/yg_hosts" ]
then
echo "found yg_hosts, copying"
cat /shared_etc/yg_hosts > /etc/hosts
fi

mkdir -p /yggdrasil
touch /yggdrasil/peers

update_yggrasil_conf() {
  tmp=$(mktemp)
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
        ADDR=$(curl --insecure "$PEER" | xargs)
        if [ -z "`echo "$ADDR" | tr -d '\n'`" ]; then
          echo "no peer response, ignore"
        else
          echo "$ADDR $KEY" >> /yggdrasil/peers
        fi
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
  PEER_ENDPOINTS="$TRIMMED_PEER_ENDPOINTS]"

  if [ $ALLOWED_KEYS != "[\"" ]; then 
    ALLOWED_KEYS=${ALLOWED_KEYS::-2}
  fi


  ALLOWED_KEYS="$ALLOWED_KEYS]"

  echo "peer endpoints: $PEER_ENDPOINTS"
  echo "allowed keys: $ALLOWED_KEYS"

  jq ".Peers = $PEER_ENDPOINTS" "$CONF" > "$tmp"
  sleep 1
  tmp2=$(mktemp)
  jq ".AllowedPublicKeys = $ALLOWED_KEYS" "$tmp" > "$tmp2"

  SIZERES=$(wc -c $CONF)
  SIZE=${SIZERES:0:1}
  if diff $tmp2 $CONF > /dev/null
  then
      send_status "yggdrasil_watcher" "ONLINE" "No differences in config."
      echo "No difference in config, skip update"
  elif [ $SIZE != '0' ]; then
      cat $tmp2 > $CONF
      send_status "yggdrasil_watcher" "ONLINE" "Updated config."
      echo "Difference, update config"
  fi

  rm $tmp $tmp2
}

loop_status () {
  while true; do
      send_status "yggdrasil_watcher" "ONLINE" "Waiting for changes to yg_hosts."
      sleep 120
  done
}

start_loop_status () {
  loop_status &
  LOOP_PID=$!
}

stop_loop_status () {
  kill $LOOP_PID >/dev/null 2>&1
}

update_yggrasil_conf
start_loop_status

while inotifywait -e close_write /shared_etc/yg_hosts; 
do
  stop_loop_status
  echo "updated, copy yg_hosts"
  update_yggrasil_conf
  start_loop_status
done

echo "Unexpected exit!"
send_status "yggdrasil_watcher" "OFFLINE" "Exiting unexpectedly!"

exit 1
