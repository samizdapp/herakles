#!/bin/ash
export HOME=/opt/pleroma

set -e


echo "-- Waiting for database..."
while ! pg_isready -U ${DB_USER:-pleroma} -d postgres://${DB_HOST:-db}:5432/${DB_NAME:-pleroma} -t 1; do
    sleep 1s
done


while [ ! -f /etc/yggdrasil-network/backup.conf ]
do
echo "waiting for yggdrasil config"
sleep 5
done

SIZERES=$(wc -c /etc/yggdrasil-network/config.conf)
SIZE=${SIZERES:0:1}
if [ $SIZE == '0' ]; then
  echo "configuration file is empty, restore from backup"
  rm /etc/yggdrasil-network/config.conf
  cp /etc/yggdrasil-network/backup.conf /etc/yggdrasil-network/config.conf
fi

echo "get public key"
PUB=$(jq '.PublicKey' /etc/yggdrasil-network/config.conf | tr -d '"')
echo $PUB
P1=${PUB:0:63}
P2=${PUB:63:1}
echo $PUB
export DOMAIN="pleroma.$P1.$P2.yg"
echo $DOMAIN



echo "-- Running migrations..."
$HOME/bin/pleroma_ctl migrate
# $HOME/bin/pleroma_ctl config migrate_to_db


$HOME/watch_hosts.sh & jobs

echo "-- Starting!"
# sleep infinity
exec $HOME/bin/pleroma start
