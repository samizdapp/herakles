#!/bin/bash
touch /shared_etc/hosts
sleep 20

follow_relays() {
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
}


echo "watch hosts"
if [ -f "/shared_etc/hosts" ]
then
echo "found hosts, copying"
cat /shared_etc/hosts > /etc/hosts
echo "" >> /etc/hosts
fi


touch /opt/pleroma/relays
follow_relays

while inotifywait -e close_write /shared_etc/hosts; 
do 
  echo "updated, copy hosts"
  cat /shared_etc/hosts > /etc/hosts
  echo "" >> /etc/hosts # need final line end
  readarray FOLLOWED < /opt/pleroma/relays
  follow_relays
done