#!/bin/bash

source /crawler/status.sh

export VERSION=12
touch "/shared_etc/hosts_crawled$VERSION"
SLEEP=10

WAITING_MSG="Waiting to crawl again."
send_status "yggdrasil_crawler" "WAITING" "$WAITING_MSG"

while :
do
  echo "peers crawl loop"
  tmp=$(mktemp)
  cat hosts_header > $tmp
  cat "/shared_etc/hosts_crawled$VERSION" >> $tmp

  if diff $tmp /shared_etc/yg_hosts > /dev/null
  then
      echo "No difference, skip update, increase sleep"
      SLEEP=10
  else
      SLEEP=10
      cat $tmp > /shared_etc/yg_hosts
      echo "Difference, update yg_hosts, reset sleep"
  fi
  rm $tmp
  cat /shared_etc/yg_hosts
  echo "run crawl script"

  send_status "yggdrasil_crawler" "ONLINE" "Crawling for new hosts."

  python3 -u example.py
  echo "ran script"

  send_status "yggdrasil_crawler" "WAITING" "$WAITING_MSG"

  sleep $SLEEP
done
