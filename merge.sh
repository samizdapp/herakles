#!/bin/bash

update_submodule() {
    pushd $1 
    SHA=$(git rev-parse --short HEAD)
    git fetch
    git checkout master
    git merge $SHA -m "merge $SHA"
    git push origin master
    popd
}

checkout_submodule() {
    pushd $1 
    git checkout develop
    git pull origin develop
    popd
}

update_all_submodules() {
    update_submodule lib de
    update_submodule daemon/caddy
    update_submodule athena
    update_submodule mdns-advertise
    update_submodule yggdrasil/crawler
    update_submodule service/wifi-connect
    git commit . -m "finalize dev submodules"
    git push origin develop
    git checkout master
    git merge develop -m "merge develop"
    git push origin master
    # restore all submodules to develop
    checkout_submodule lib
    checkout_submodule daemon/caddy
    checkout_submodule athena
    checkout_submodule mdns-advertise
    checkout_submodule yggdrasil/crawler
    checkout_submodule service/wifi-connect
}

git checkout develop

if [ -z "$(git status --porcelain)" ]; then 
  # Working directory clean
  update_all_submodules
else 
    echo "dirty working directory"
  # Uncommitted changes
fi
