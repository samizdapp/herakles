#!/bin/bash
CONF_DIR="/etc/yggdrasil-network"
CONF="$CONF_DIR/config.conf"
while inotifywait -e close_write $CONF; 
do
    kill yggdrasil
    yggdrasil --useconf -json < "$CONF_DIR/config.conf"
done