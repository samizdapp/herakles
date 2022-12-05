# Herakles Caddy

simple reverse proxy: listens on all interfaces, forwards anything with an `x-intercepted-subdomain` to the daemon that matches the header (e.g. `matrix` will forward to the container `daemon_matrix` on port 80).

Should be used as a submodule of [herakles](hittsp://github.com/samizdapp/herakles)

## Roadmap

- use the encrypted proxy server from [herakles-lib](https://github.com/samizdapp/herakles-lib) as the dispatcher
