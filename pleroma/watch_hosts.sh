#!/bin/bash
touch /shared_etc/hosts

follow_relays() {
  relays=""
  while read p
  do
    if [[ $p == *"pleroma."* ]]; then
      echo "found pleroma entry"
      parts=($p)
      RELAY="https://${parts[1]}/relay"
      relays="$relays $RELAY"
    fi
  done <<< "$(cat /etc/hosts)"
  echo "found $relays"
  # iterate over array and add to relays
  for i in $relays
  do
    echo "follow $i"
    /opt/pleroma/bin/pleroma_ctl relay follow $i || true
  done
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
  readarray FOLLOWED  < /opt/pleroma/relays
  follow_relays
done