#!/bin/bash

echo "5000" > /yggdrasil/port
rm /yggdrasil/peer

if $SKIP_UPNP == "true"; then
    echo "skip upnp"
    sleep infinity
fi

clear_upnp_table(){
    LAN_ADDR=$(upnpc -l | grep "Local LAN ip address" | cut -d: -f2)
    upnpc -l | sed 1d | \
    while read i;
    do
      echo "line: " $i
      PARTS=($i)
      CLEAR="0"
      if [ ${PARTS[1]} == "TCP" ] || [ ${PARTS[1]} == "UDP" ]; then
        echo "is entry"
        IN=${PARTS[2]}
        IFS='->' read -ra INFO <<< "$IN"
        echo "port: " ${INFO[0]}
        IFS=':' read -ra IPP <<< "${INFO[2]}"
        echo "ip: " ${IPP[0]}
        if [ ${IPP[0]} != $LAN_ADDR ]; then
            echo "try to delete upnp entry"
            if upnpc -d ${INFO[0]} ${PARTS[1]}; then
                return [0]
            fi
        fi
      fi
    done
    echo "done"
}
echo "Press [CTRL+C] to stop.."
PORT=$(cat /yggdrasil/port)
WAN_ADDR=$(dig +short txt ch whoami.cloudflare @1.0.0.1 | tr -d '"')
echo "try port $PORT"
RETRY="true"
while ! upnpc -r 5000 $PORT TCP
do
    PORT=$(($PORT + 1))
    echo "increment port $PORT"
    echo "$PORT" > /yggdrasil/port

    if [ "$PORT" == "5010" ]; then
        if [ "$RETRY" == "true" ]; then
            RETRY="false"
            clear_upnp_table
        else 
            sleep infinity
        fi
        echo "5000" > /yggdrasil/port
        PORT="5000"
    fi
done


echo "tcp://$WAN_ADDR:$PORT" > /yggdrasil/peer
sleep infinity  
