#!/bin/sh

export SYNAPSE_SERVER_NAME=matrix.localhost
export SYNAPSE_REPORT_STATS=no 

if [ ! -f /data/homeserver.yaml ]
then
    /start.py generate
    echo "#" >> /data/homeserver.yaml
    echo "enable_registration: true" >> /data/homeserver.yaml
    sed -i '/  - port: 8008/c\  - port: 80' /data/homeserver.yaml
fi

/start.py

