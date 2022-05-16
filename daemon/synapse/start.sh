#!/bin/sh

export SYNAPSE_SERVER_NAME=matrix.home.local
export SYNAPSE_REPORT_STATS=no 

if [ ! -f /data/homeserver.yaml ]
then
    /start.py generate
    echo "#" >> /data/homeserver.yaml
    echo "enable_registration: true" >> /data/homeserver.yaml
fi

/start.py

