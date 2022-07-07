#!/bin/bash

if ! [ -f "./daemon/next/.next" ]
then
pushd ./daemon/next
npm install
npm run build
popd
fi

docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.local.yml up --build


