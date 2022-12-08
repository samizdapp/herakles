#!/bin/sh
if [ -f "/shared_etc/yg_hosts" ]
then
cp /shared_etc/yg_hosts /etc/hosts
fi

while inotifywait -e close_write /shared_etc/yg_hosts; 
do 
echo "copy yg_hosts"
cp /shared_etc/yg_hosts /etc/hosts
done