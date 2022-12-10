#!/bin/sh
if [ -f "/shared_etc/hosts" ]
then
cp /shared_etc/hosts /etc/hosts
fi

while inotifywait -e close_write /shared_etc/hosts; 
do 
echo "copy hosts"
cp /shared_etc/hosts /etc/hosts
done