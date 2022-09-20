#!/bin/sh

while [ ! -d "/var/lib/pleroma/static/frontends/soapbox-fe/static" ];
do
  # Take action if $DIR exists. #
  echo "Trying to install soapbox... sleep 10 first"
  mkdir -p /var/lib/pleroma/static/frontends/soapbox-fe
  sleep 10
  curl -L https://gitlab.com/soapbox-pub/soapbox/-/jobs/artifacts/develop/download?job=build-production -o soapbox.zip
  busybox unzip soapbox.zip -o -d /var/lib/pleroma/static/frontends/soapbox-fe
done