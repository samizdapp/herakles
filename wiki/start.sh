#!/bin/bash

run_wiki() {
    echo "killing wiki";
    killall node;
    echo "copy hosts";
    cat /shared_etc/hosts > /etc/hosts;
    echo "copy welcome-visitors";
    if [ -f /wiki/init ]
    then
    echo "skip init";
    else
    touch /wiki/init;
    cat /usr/src/athena/welcome-visitors.json > /wiki/pages/welcome-visitors;
    fi
    WIKIS="sites.fed.wiki.org"
    SELFSEEN="false"
    while read p
    do
        if [[ $p == *"wiki."* ]]; then
            #The first entry will always be ourselves, so we skip it
            if [[ $SELFSEEN == "true" ]]; then
            echo "found wiki entry";
            parts=($p);
            WIKI="${parts[1]}";
            WIKIS="$WIKIS,$WIKI";
            else 
            echo "found self";
            SELFSEEN="true";
            fi
        fi
    done <<< "$(cat /etc/hosts)"
    echo "Starting wiki with $WIKIS"
    wiki --data /wiki --security_legacy true --neighbors "$WIKIS" &
}

run_wiki

echo "watch hosts"
while inotifywait -e close_write /shared_etc/hosts;
do
    echo "updated, copy hosts"
    run_wiki
done