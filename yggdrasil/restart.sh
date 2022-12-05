#!/bin/bash


/usr/bin/entrypoint.sh & jobs

CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
while inotifywait -e close_write $CONF; 
do
    echo "detected yggdrasil config change, restart container"
    exit
done