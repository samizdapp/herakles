# Herakles

_Warning: this code is currently mid-refactor, and will take a lot of patience to get working_

This is a boilerplate for an approach to self-hosting that allows device owners to easily discover and communicate with a device on their residential internet, and continue communicating over the open internet, without needing to do any manual router configuration or purchase a domain name.

## Project structure

This repo is mostly an accumulation of various git submodules, composed via docker.

- lib: a (soon to be) node module that contains shared abstractions for secure communication with a self-hosted server on LAN and WAN
- app: a react-native app that wraps a webview with some functionality from lib
- daemon/next: a progressive web app. accessed via supported browsers or via the app.
- daemon/synapse: a matrix homeserver (for demonstration of the self-hosting model)
- daemon/caddy: a reverse proxy to demux incoming requests between the next webserver and other daemons.
- harness/cinny: a matrix client frontend
- service/hostname: a service to change device hostname
- service/upnp: open ports and record addresses
- service/wifi-connect: bootstrap device WiFi connection

## Build and push to local box via balena

```bash
balena push $IP_ADDRESS -mds build && balena push $IP_ADDRESS -m --env MDNS_TLD=$MDNS_TLD
```

where `$IP_ADDRESS` is the IP address of your local box and `$MDNS_TLD` is the
mDNS domain you wish to use to connect to your box.

## Build via docker-compose

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
