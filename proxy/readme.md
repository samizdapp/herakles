# Herakles-lib

This is a messy, in-progress migration of shared logic from [herakles](https://github.com/samizdapp/herakles)

More documentation is coming soon, but the TLDR is that this module contains a bespoke proxy server and client code to connect to it from various client runtimes. The goal is to create a platform where a device and it's owner can communicate directly without cloud proxy, purchasing a domain name, or messing with router port forwarding.

## Functionality

This library is concerned with 4 basic functions:

- Wrapper around 2KeyRatchet library to provide forward-secret messaging
- cross-platform storage with a consistent API, covering various runtimes (web, node, service worker, and react-native). This is for persisting ratchet keys
  - sharing storage between different origins in react-native-webview
- a client routing layer to intercept, encrypt, and dispatch AJAX request to one of a set of tracked IP addresses and ports
- A reverse proxy server to manage client cipher sessions, and listen on multiple addresses

The cumulative goal is to provide an environment where arbitrary web apps can be served both over LAN and WAN connections, either via progressive web app and service worker, or via a react-native app with a bundled web view.

## Usage

For the time being (until it is published in npm), this library should be used exclusively as a submodule of the [herakles](https://github.com/samizdapp/herakles) repo. That codebase is setup to mount the `dist` directory inside the node_modules of both the expo app and next webapp containers. Build instructions coming soon, but basically:

```
$ rollup src/file.js --file dist/file.js --format cjs
```

more docs and fancy file watching/recompilation is desired.
