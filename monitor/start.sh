#!/bin/sh

monitor_supervisor(){
    while :
    do
        date +"%T" >> /monitor/balena.log
        curl -X GET -v --header "Content-Type:application/json" "$BALENA_SUPERVISOR_ADDRESS/v1/device?apikey=$BALENA_SUPERVISOR_API_KEY" >> /monitor/balena.log
        curl --write-out '%{http_code}' --silent --output /dev/null "$BALENA_SUPERVISOR_ADDRESS/v1/healthy" >> /monitor/balena.log
        sleep 600
    done
}

monitor_journal(){
    journalctl -f >> /monitor/journal.log
}

monitor_supervisor &
monitor_journal &

sleep infinity