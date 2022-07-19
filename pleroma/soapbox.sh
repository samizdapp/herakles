#!/bin/sh

while [ ! -d "/var/lib/pleroma/static/frontends/soapbox-fe" ];
do
  # Take action if $DIR exists. #
  echo "Trying to install soapbox... sleep 10 first"
  sleep 10
  $HOME/bin/pleroma_ctl frontend install soapbox-fe --ref v2.0.0
done