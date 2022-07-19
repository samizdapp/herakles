#!/bin/bash

# if ! [ -f "./daemon/next/.next" ]
# then
# pushd ./daemon/next
# npm install
# npm run build
# popd
# fi

# if ! [ -f "./lib/node_modules" ]
# then
# pushd ./lib
# npm install
# popd
# fi

# if ! [ -f "./app/node_modules" ]
# then
# pushd ./app
# npm install
# popd
# fi


docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.local.yml up --build


