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
