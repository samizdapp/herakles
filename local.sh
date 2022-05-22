#!/bin/bash
docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.local.yml up --build


