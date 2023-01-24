# Herakles

The herakles project is the staging, build, and deployment repo for SamizdApp.

It consists of various scripts, configs and submodules that are assembled
together for deployment to a box using balena.

This repo's GitHub Issues serve as the source of truth for all
SamizdApp-related tickets.

## Brief Overview of SamizdApp

SamizdApp is an approach to self-hosting that allows device owners to easily
discover and communicate with a device on their residential internet, and
continue communicating over the open internet, without needing to do any manual
router configuration or purchase a domain name. Read more at
[https://samizdapp.github.io/](https://samizdapp.github.io/).

## Project structure

The repo assembles various scripts, configs, and submodules into a docker
compose stack specified in `docker-compose.yml`.

### Caddy

Type: `config/scripts`<br />
Service: `daemon_caddy`

The files under [caddy/](caddy/) are a collection of scripts and config that
make up the `daemon_caddy` service. It provides a central communication hub for
all services on the box, and an external endpoint for all clients.

### Athena

Type: `submodule`<br />
Service: `app_service`, `gateway_client`, `networking_service`, `status_service`

The Athena project contains all of the in-house SamizdApp services. Read the
documentation at
[https://github.com/samizdapp/athena](https://github.com/samizdapp/athena) for
more information.

### mDNS Advertise

Type: `submodule`<br />
Service: `mdns-advertise`

This is a forked dependency from balena that advertises the mDNS name of the
box.

### Monitor

Type: `config/scripts`<br />
Service: `monitor`

### Hostname

Type: `submodule`<br />
Service: `hostname`

This is a forked dependency from balena.

### WiFi Connect

Type: `submodule`<br />
Service: `service_wifi-connect`

This is a forked dependency from balena that manages a box's WiFI connection,
either to another client (as a part of client installation) or to a local
network (for internet connectivity).

### Yggdrasil

Type: `submodule`, `config/scripts`<br />
Service: `yggdrasil`,

Yggdrasil consists of a forked version of the yggdrasil app, along with various
scripts that alter its behavior and add new behaviors. Some of the scripts are
obsolete.

Yggdrasil provides a connection to the Yggdrasil network, and custom scripts
provide Yggdrasil DNS resolution to various services.

### Pleroma

Type: `submodule`, `config/scripts`<br />
Service: `daemon_pleroma`

Pleroma consists of a forked version of the pleroma app, along with various
scripts that alter its behavior and add new behaviors. Some of the scripts are
obsolete.

Pleroma is currently the only app available on SamizdApp. It talks to other
instances of Pleroma on the SamizdApp network over Yggdrasil.

### Obsolete Scripts and Files

The following files may appear to be useful or meant to be used as part of a
process for managing the project; however, they are in fact obsolete and should
not be used:

- `.env.sample`
- `balena.sh`
- `docker-compose.local.yml`
- `local.sh`
- `merge.sh`
- `setup.sh`

## Development & Management

### Local Development

#### Build and push to local box via balena

```bash
balena push $IP_ADDRESS -mds build && balena push $IP_ADDRESS -m --env MDNS_TLD=$MDNS_TLD
```

where `$IP_ADDRESS` is the IP address of your local box and `$MDNS_TLD` is the
mDNS domain you wish to use to connect to your box.

You can create a `.balena/balena.yml` deployment file (_note:_ this is
different than the `balena.yml` file) to specify build arguments. Currently,
available build arguments are: `NX_BUILD_COMMIT`, `NX_BUILD_BRANCH`, and
`NX_BUILD_NUMBER`; they are all optional.

#### Build via docker-compose

To build with plain docker-compose, run these two commands, first:

```bash
docker-compose -f build/docker-compose.yml build
```

then:

```bash
cp mdns-advertise/Dockerfile.template mdns-advertise/Dockerfile && \
sed -i -e 's/%%BALENA_ARCH%%/aarch64/g' mdns-advertise/Dockerfile && \
cp monitor/Dockerfile.template monitor/Dockerfile && \
sed -i -e 's/%%BALENA_ARCH%%/aarch64/g' monitor/Dockerfile && \
cp service/hostname/Dockerfile.template service/hostname/Dockerfile && \
sed -i -e 's/%%BALENA_ARCH%%/aarch64/g' service/hostname/Dockerfile && \
docker-compose build && \
rm mdns-advertise/Dockerfile && \
rm monitor/Dockerfile && \
rm service/hostname/Dockerfile
```

### CI/CD

GitHub Actions is used for CI/CD.

The `build` workflow runs on every push and pull request, executes linting,
performs tests, and ensures the stack build successfully on balenaCloud.

The `deploy` workflow runs automatically after the `build` workflow _on the
`develop` branch only._. The workflow must be manually run after a successful
`build` on the `master` branch in order to deploy to production.

The `update-submodules` workflow is called by other submodule repos in order to
automatically open a PR to update the submodule in this repo.

### Submodule Management

The following processes must be followed in order to keep the submodules up to
date with this repo.

#### Merge Auto-Generated Submodule Update PRs

Each submodule repo has been configured to automatically open or update a
submodule update PR in this repo. These PR's must be manually merged in to the
`develop` branch periodically in order to apply submodule updates to this repo.

#### Merge `develop` Into `master` to Deploy to Production

When the `develop` branch is read to deploy to production, it should be merged
into the `master` branch. This applies for this repo and all of it's submodules.
The following procedure can be used for merging all of the submodule branches:

```bash
git switch develop
git pull
git submodules foreach git switch develop
git submodules foreach git pull
git submodules foreach git switch master
git submodules foreach git merge develop
git submodules foreach git push
git switch master
git merge develop
git push
```

All of the above merges should be fast-forward only. If any of the merges are
not fast-forward, they should be reverted and the diverged branches should be
resolved before attempting to merge into `master`.

After `master` is pushed, the `build` will run. After `build` completes
successfully, `master` can be manually `deploy`ed.

#### Push Hotfixes to `master` and Merge Back Into `develop`

Sometimes, it may be necessary to deploy a hotfix directly to production. In
such a case, the hotfix may be pushed directly to `master`, but it should be
merged back into `develop` so that the branches do not diverge:

```bash
git switch master
git pull
git submodules foreach git switch master
git submodules foreach git pull
git submodules foreach git switch develop
git submodules foreach git pull
git submodules foreach git merge master
git submodules foreach git push
git switch develop
git pull
git merge master
git push
```
