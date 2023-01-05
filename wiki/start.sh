#!/bin/bash

run_wiki() {
    echo "killing wiki";
    killall node;
    echo "copy hosts";
    cat /shared_etc/hosts > /etc/hosts;
    while read p
    do
        if [[ $p == *"wiki."* ]]; then
        echo "found wiki entry";
        parts=($p);
        WIKI="https://${parts[1]}";
        WIKIS="$WIKIS$WIKI,";
        fi
    done <<< "$(cat /etc/hosts)"
    echo "Starting wiki with $WIKIS"
    wiki --data /wiki --security_legacy true --neighbours "$WIKIS" &
}

run_wiki

echo "watch hosts"
while inotifywait -e close_write /shared_etc/hosts;
do
    echo "updated, copy hosts"
    run_wiki
done