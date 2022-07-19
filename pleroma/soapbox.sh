#!/bin/sh

while [ ! -d "/var/lib/pleroma/static/frontends/soapbox-fe" ];
do
  # Take action if $DIR exists. #
  echo "Trying to install soapbox..."
  $HOME/bin/pleroma_ctl frontend install soapbox-fe --ref v2.0.0
  sleep 1
done