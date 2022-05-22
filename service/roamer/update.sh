#!/bin/sh
while :
do
	echo "Press [CTRL+C] to stop.."
    WAN_ADDR=$(dig +short txt ch whoami.cloudflare @1.0.0.1 | tr -d '"')
    LAN_ADDR=$(upnpc -l | grep "Local LAN ip address" | cut -d: -f2)
    echo "[\"$WAN_ADDR:8889\",\"$LAN_ADDR\"]" > /roamer/addresses
    upnpc -r 80 8889 TCP
	sleep 3600
done
