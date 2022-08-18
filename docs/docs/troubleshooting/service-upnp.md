---
sidebar_position: 2
---

# service_upnp

## AddPortMapping(...) failed with code 402 (Invalid Args)

### Symptoms

- There is no response for requests to `setup.local`.
- daemon_proxy is in a restart loop with the error:
  ```
  Error: ENOENT: no such file or directory, open './upnp/addresses'
  ```
- service_upnp is in a loop constantly failing to add a UPnP port mapping with
  the error:
  ```
  AddPortMapping(port, 4000, IP) failed with code 402 (Invalid Args)
  ```

### Cause

This is generally caused by the UPnP Portmap Table of your router being full (different routers have different limits).

### Resolution

Some routers' firmware may allow you to clear the table or delete entries. If not, resetting the router by unplugging its power, waiting 10 seconds, and plugging it back in should clear the table.

### Additional Info

See: https://github.com/samizdapp/herakles-upnp/issues/1
