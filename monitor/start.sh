#!/bin/sh

while :
do
date +"%T" >> /monitor/monitor.log
curl -X -v GET --header "Content-Type:application/json" \
    "$BALENA_SUPERVISOR_ADDRESS/v1/device?apikey=$BALENA_SUPERVISOR_API_KEY" >> /monitor/monitor.log
curl -v "$BALENA_SUPERVISOR_ADDRESS/v1/healthy" >> /monitor/monitor.log
sleep 600
done