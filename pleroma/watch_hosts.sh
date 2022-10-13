#!/bin/bash

echo "watch hosts"
if [ -f "/shared_etc/yg_hosts" ]
then
echo "found yg_hosts, copying"
cat /shared_etc/yg_hosts > /etc/hosts
fi

touch /opt/pleroma/relays

while inotifywait -e close_write /shared_etc/yg_hosts; 
do 
  echo "updated, copy yg_hosts"
  cat /shared_etc/yg_hosts > /etc/hosts
  echo "" >> /etc/hosts # need final line end
  readarray FOLLOWED < /opt/pleroma/relays
  while read p; do
    echo "check $p" 
    if [[ $p == *"pleroma."* ]]; then
      echo "found pleroma entry"
      parts=($p)
      RELAY="https://${parts[1]}/relay"
      # if ! grep -q $RELAY "/opt/pleroma/relays"; then
      #   echo "not found in relay index"
      /opt/pleroma/bin/pleroma_ctl relay follow $RELAY
      #   echo $RELAY >> /opt/pleroma/relays
      # fi
    fi
  done < /etc/hosts
done