#!/bin/sh

# if [ ! -f ./port ]
# then
echo "5000" > /yggdrasil/port
# fi


while :
do
    echo "Press [CTRL+C] to stop.."
    PORT=$(cat /yggdrasil/port)
    WAN_ADDR=$(dig +short txt ch whoami.cloudflare @1.0.0.1 | tr -d '"')
    echo "try port $PORT"
    while ! upnpc -r 5000 $PORT TCP
    do
        PORT=$(($PORT + 1))
        echo "increment port $PORT"
        echo "$PORT" > /yggdrasil/port

        if [[ "$PORT" == "5010" ]]; then
            exit
        fi
    done


    echo "tcp://$WAN_ADDR:$PORT" > /yggdrasil/peer
    
    sleep 3600
done
