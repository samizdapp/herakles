import { Noise } from "@chainsafe/libp2p-noise";
import { Bootstrap } from "@libp2p/bootstrap";
import { Mplex } from "@libp2p/mplex";
import {
  createEd25519PeerId,
  createFromProtobuf,
  exportToProtobuf,
} from "@libp2p/peer-id-factory";
import { WebSockets } from "@libp2p/websockets";
import chokidar from "chokidar";
import fetch from "cross-fetch";
import { readFile, writeFile, rm } from "fs/promises";
import { pipe } from "it-pipe";
import { createLibp2p } from "libp2p";
import { decode, encode } from "lob-enc";
import localip from "local-ip";
import NATApi from "nat-api";
import { Socket } from "net";
import { mapPort } from "./upnp.js";
import { webcrypto } from "crypto";
import WebSocket from "ws";
import { KEEP_ALIVE } from "@libp2p/interface-peer-store/tags";
import { EventEmitter } from "events";
import { exec } from "child_process";
import { promisify } from "node:util";
import dns from "dns/promises";
import http from "http";
import https from "https";
const execProm = promisify(exec);

const CHUNK_SIZE = 1024 * 64;

const getHeadersJSON = (h) => {
  const ret = {};
  for (const pair of h.entries()) {
    ret[pair[0]] = pair[1];
  }
  return ret;
};

const getResponseJSON = (r) => ({
  ok: r.ok,
  headers: getHeadersJSON(r.headers),
  redirected: r.redirected,
  status: r.status,
  statusText: r.statusText,
  type: r.type,
  url: r.url,
});
const ID_PATH = process.env.ID_PATH || "./store/id";
const PUBLIC_PATH = process.env.PUBLIC_PATH || "./store";
const BOOTSTRAP_PATH = `${PUBLIC_PATH}/libp2p.bootstrap`;
const RELAY_CACHE_PATH = `${PUBLIC_PATH}/libp2p.relays`;
const PRIVATE_PORT = 9000;

const getLocalIPS = async () => {
  const res = await Promise.all(
    ["eth0", "wlan0", "en0"].map(
      (iface) =>
        new Promise((resolve) =>
          localip(iface, (err, ip) => resolve(err ? null : ip))
        )
    )
  );
  return res.filter((i) => i);
};

const getLocalMultiaddr = async (idstr) => {
  const [localIP] = await getLocalIPS();
  return `/ip4/${localIP}/tcp/${PRIVATE_PORT}/ws/p2p/${idstr}`;
};

const getIP = async (nat) =>
  new Promise((resolve, reject) => {
    nat.externalIp(function (err, ip) {
      if (err) return reject(err);
      resolve(ip);
    });
  });

const YGGDRASIL_PEERS = "/yggdrasil/peers";

const ygDomainMap = new Map();

const getRelayAddrs = async (peerId) => {
  const yg_peers = (
    await readFile(YGGDRASIL_PEERS).catch((e) => Buffer.from(""))
  )
    .toString()
    .split("\n");

  const proms = [];

  for (const host_str of yg_peers) {
    const [ip_part, host] = host_str.split(" ");
    if (!host) continue;

    const p1 = host.slice(0, host.length - 1);
    const p2 = host.slice(host.length - 1);
    const domain = `${p1}.${p2}.yg`;
    ygDomainMap.set(domain, ip_part);
    const fetchaddr = `${domain}/libp2p.relay`;
    // console.log("try relay", fetchaddr);
    proms.push(
      fetch(fetchaddr)
        .then((r) => r.text())
        .catch((e) => {
          return "";
        })
        .then((raw) => raw.trim())
    );
  }

  const addrs = (await Promise.all(proms)).filter(
    (multiaddr) => multiaddr && !multiaddr.includes(peerId.toString())
  );

  // console.log("relay addrs", addrs);
  return addrs;
};

const delay = async (ms) => new Promise((r) => setTimeout(r, ms));

const makeWatchProm = async (file_path, cb) => {
  const chok = chokidar.watch(file_path);

  const abort = async () => {
    try {
      await chok.unwatch();
    } catch (e) {
      console.log("unwatch error", e);
    }
  };
  const prom = new Promise(async (resolve, reject) => {
    chok.on("change", async () => {
      await cb();
      await chok.unwatch();
      resolve(true);
    });
    chok.on("error", async () => {
      await delay(10000);
      resolve(true);
    });
  });

  return { abort, prom };
};

async function* makeWatcher(file_path, id = webcrypto.randomUUID()) {
  let timeout = 1000,
    aborted = false;

  const resetTimeout = () => {
    console.log("reset timeout");
    timeout = 1000;
  };

  const abort = () => {
    aborted = true;
  };

  while (!aborted) {
    // console.log("watcher loop", id, new Date());
    const { prom, abort } = await makeWatchProm(file_path, resetTimeout);

    const ok = await Promise.race([prom, delay(timeout)]).then(() => true);
    await abort();
    timeout *= 2;
    timeout = Math.min(timeout, 1000 * 60 * 10);
    yield abort;
  }
}

async function pollDial(node, addr) {
  console.log("dial", addr);
  let conn = null;
  do {
    conn = await node.dialProtocol(addr, "/samizdapp-heartbeat").catch((e) => {
      return new Promise((r) => setTimeout(r, 30000));
    });
  } while (!conn);
  console.log("got heartbeat stream", addr);
  return conn;
}

async function keepalive(node, addr) {
  while (true) {
    const raw = await pollDial(node, addr);
    if (!raw) {
      console.log("abandon keepalive", addr);

      break;
    }
    console.log("got keepalive stream", addr);
    const stream = new RawStream(raw);

    let read = null,
      timeout = null;
    while (stream.isOpen && (read = await stream.read()) !== null) {
      clearTimeout(timeout);
      timeout = setTimeout(stream.close.bind(stream), 10000);
    }
    console.log("keepalive stream down", addr);
  }
}

async function cachePublicMultiaddr(ma) {
  const cache = await readFile(RELAY_CACHE_PATH)
    .then((s) => new Set(s.toString().trim().split(",")))
    .catch(() => new Set());
  cache.add(ma);
  await writeFile(RELAY_CACHE_PATH, Array.from(cache).join(","));
}

function relayStreamFactory(node) {
  const relays = new Set();

  (async function () {
    const watcher = makeWatcher(YGGDRASIL_PEERS, "dial_relays");
    let done = false;
    do {
      (await getRelayAddrs(node.peerId)).filter((str) => {
        const _seen = relays.has(str);
        relays.add(str);
        return !_seen;
      });
      const res = await watcher.next();
      done = res.done;
    } while (!done);
  })();

  return async function* makeRelayStream() {
    const seen = new Set();
    while (true) {
      await new Promise((r) => setTimeout(r, 1000));
      for (const relay of Array.from(relays)) {
        if (!seen.has(relay)) {
          seen.add(relay);
          yield relay;
        }
      }
    }
  };
}

async function dialRelays(node, makeRelayStream) {
  const relayStream = makeRelayStream();
  let relay;
  while ((relay = (await relayStream.next()).value)) {
    keepalive(node, relay);
  }
}

async function monitorMemory() {
  while (true) {
    const used = process.memoryUsage();
    console.log("current memory usage:");
    for (let key in used) {
      console.log(
        `${key} ${Math.round((used[key] / 1024 / 1024) * 100) / 100} MB`
      );
    }
    await new Promise((r) => setTimeout(r, 360000));
  }
}

export default async function main() {
  const nat = new NATApi();
  console.log("starting", ID_PATH, PUBLIC_PATH);

  const peerId = await readFile(ID_PATH)
    .then(createFromProtobuf)
    .catch(async (e) => {
      const _id = await createEd25519PeerId();
      await writeFile(ID_PATH, exportToProtobuf(_id));
      return _id;
    });

  // await writeFile("/yggdrasil/libp2p.id", peerId.toString());

  const bootstrap = await getLocalMultiaddr(peerId.toString());
  await writeFile(BOOTSTRAP_PATH, bootstrap);

  // const datastore = new LevelDatastore("./libp2p");
  // await datastore.open(); // level database must be ready before node boot

  const privatePort = PRIVATE_PORT;
  const { success, publicPort } = await mapPort(privatePort);
  const publicIP = await getIP(nat).catch(() => null);

  const relay_peers = await getRelayAddrs(peerId);
  const peerDiscovery = relay_peers.length
    ? [
        new Bootstrap({
          list: relay_peers,
        }),
      ]
    : undefined;

  // console.log("peerDiscovery", peerDiscovery);

  const announce =
    success && publicIP ? [`/ip4/${publicIP}/tcp/${publicPort}/ws`] : undefined;

  if (announce) {
    const ma = `${announce[0]}/p2p/${peerId.toString()}`;
    await writeFile("/yggdrasil/libp2p.relay", ma);
    await cachePublicMultiaddr(ma);
  } else {
    await rm("/yggdrasil/libp2p.relay").catch((e) => {
      //will throw error if no file, ignore
    });
  }
  const listen = ["/ip4/0.0.0.0/tcp/9000/ws", "/ip4/0.0.0.0/tcp/9001"];
  const node = await createLibp2p({
    peerId,
    // datastore,
    addresses: {
      listen: ["/ip4/0.0.0.0/tcp/9000/ws", "/ip4/0.0.0.0/tcp/9001"], //,
      // announce: announce
    },
    transports: [new WebSockets()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    // dht: new KadDHT(),

    peerDiscovery,
    relay: {
      enabled: true,
      hop: {
        enabled: true,
        timeout: 10e8,
      },
      advertise: {
        enabled: true,
      },
    },
    connectionManager: {
      autoDial: false, // Auto connect to discovered peers (limited by ConnectionManager minConnections)
    },
    // minConnections: 0,
    //   maxDialsPerPeer: 10
    //   // The `tag` property will be searched when creating the instance of your Peer Discovery service.
    //   // The associated object, will be passed to the service when it is instantiated.
    // },
    // peerStore: {
    //   // persistence: true,
    //   threshold: 5
    // },
    // keychain: {
    //   pass: 'notsafepassword123456789',
    //   datastore,
    // }
  });

  // node.peerStore.addEventListener("change:multiaddrs", (evt) => {
  //   // Updated self multiaddrs?
  //   if (evt.detail.peerId.equals(node.peerId)) {
  //     // console.log(`Advertising with a relay address of`);
  //     // node.getMultiaddrs().forEach((m) => console.log(m.toString()));
  //     // console.log(evt.detail);
  //   }
  // });

  let makeRelayStream = null;

  node.handle("/samizdapp-relay", async ({ stream, connection }) => {
    while (!makeRelayStream) {
      await new Promise((r) => setTimeout(r, 1000));
    }

    let abort = false;
    pipe(function () {
      return (async function* () {
        const relayStream = makeRelayStream();
        if (announce) {
          yield Buffer.from(`${announce[0]}/p2p/${peerId.toString()}`);
        }
        let relay;
        while ((relay = (await relayStream.next()).value)) {
          yield Buffer.from(`${relay}/p2p-circuit/p2p/${peerId.toString()}`);
        }
      })();
    }, stream);

    // await waitTillClosed(connection, node);
    // while (!abort) {
    //   await new Promise((r) => setTimeout(r, 1000));
    // }
    // abort();
  });

  const readNextLob = async (ws) =>
    new Promise(
      (r) =>
        (ws.onmessage = ({ data, ...json }) => {
          // console.log("got ws message", data.toString(), json);
          r(encode(json, Buffer.from(data)));
        })
    );

  node.handle("/samizdapp-heartbeat", async ({ stream, connection }) => {
    const raw = new RawStream(stream);
    console.log("got heartbeat stream");
    while (raw.isOpen) {
      raw.write(Buffer.from("deadbeef", "hex"));

      await new Promise((r) => setTimeout(r, 5000));
    }
  });

  node.handle("/samizdapp-websocket", async ({ stream }) => {
    console.log("got websocket stream", stream);

    const wsStream = new WebsocketStream(stream);
    await wsStream.init();

    console.log("end websocket stream");
  });

  node.handle(
    "/samizdapp-proxy",
    ({ stream }) => {
      // console.log('got proxy stream')
      pipe(
        stream.source,
        async function (source) {
          const chunks = [];
          for await (const val of source) {
            // console.log('stream val', val)
            const buf = Buffer.from(val.subarray());
            // console.log('chunk', buf.length, buf.toString('hex'))
            if (buf.length === 1 && buf[0] === 0x00) {
              return new Promise(async (resolve, reject) => {
                let {
                  json: { reqObj, reqInit },
                  body,
                } = decode(Buffer.concat(chunks));

                // console.log("url?", event, reqObj, reqInit);
                let fres, url, init;
                // console.log("set body", body ? body.toString() : "");
                if (typeof reqObj === "string") {
                  url = reqObj.startsWith("http")
                    ? reqObj
                    : `http://localhost${reqObj}`;
                  if (
                    reqInit.method &&
                    reqInit.method !== "HEAD" &&
                    reqInit.method !== "GET"
                  ) {
                    reqInit.body = body;
                  }
                  init = reqInit;
                } else if (typeof reqObj !== "string") {
                  reqInit = reqObj;
                  url = reqObj.url;
                  if (
                    reqObj.method &&
                    reqObj.method !== "HEAD" &&
                    reqObj.method !== "GET"
                  ) {
                    reqObj.body = body;
                  }
                  init = reqObj;
                }

                console.log("do fetch", url); //, init, init.body ? init.body : '')
                fres = await fetch(url, init).catch((error) => {
                  console.log("proxy downstream error", error);
                  resolve([
                    encode(
                      { error },
                      Buffer.from(
                        error?.toString ? error.toString() : "unknown error"
                      )
                    ),
                    Buffer.from([0x00]),
                  ]);
                  return null;
                });
                if (!fres) {
                  return;
                }
                const resb = await fres.arrayBuffer();
                const res = getResponseJSON(fres);
                const forward = encode({ res }, Buffer.from(resb));
                // console.log("got forward", res, forward.length);
                let i = 0;
                const _chunks = [];
                for (; i <= Math.floor(forward.length / CHUNK_SIZE); i++) {
                  _chunks.push(
                    forward.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
                  );
                }
                // console.log("i max", i, Math.ceil(forward.length / CHUNK_SIZE));
                _chunks.push(Buffer.from([0x00]));
                resolve(_chunks);
              });
            } else {
              chunks.push(buf);
            }
          }
        },
        stream.sink
      );
    },
    {
      maxInboundStreams: 100,
    }
  );

  node.handle(
    "/samizdapp-proxy/2.0.0",
    async ({ stream }) => {
      console.log("got proxy stream 2.0.0");
      const pStream = new RequestStream(stream);
      pStream.open();

      while (pStream.isOpen) {
        const chunks = await pStream.request();
        // console.log("got chunks", chunks);
        const raw = Buffer.concat(chunks);
        let {
          json: { reqObj, reqInit },
          body,
        } = decode(raw);

        let fres, url, init;
        // console.log("set body", body ? body.toString() : "");
        if (typeof reqObj === "string") {
          url = reqObj.startsWith("http")
            ? reqObj
            : `http://localhost${reqObj}`;
          if (
            reqInit.method &&
            reqInit.method !== "HEAD" &&
            reqInit.method !== "GET"
          ) {
            reqInit.body = body;
          }
          init = reqInit;
        } else if (typeof reqObj !== "string") {
          reqInit = reqObj;
          url = reqObj.url;
          if (
            reqObj.method &&
            reqObj.method !== "HEAD" &&
            reqObj.method !== "GET"
          ) {
            reqObj.body = body;
          }
          init = reqObj;
        }

        console.log("do fetch", url); //, init, init.body ? init.body : '')
        try {
          init.agent = staticDnsAgent(url);
          fres = await fetch(url, init);

          const resb = await fres.arrayBuffer();
          const res = getResponseJSON(fres);
          const body = Buffer.from(resb);
          const forward = encode({ res, bodyLength: body.byteLength }, body);
          // console.log("got forward", res, forward.length);
          let i = 0;
          const _chunks = [];
          for (; i <= Math.floor(forward.length / CHUNK_SIZE); i++) {
            _chunks.push(forward.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
          }
          // console.log("i max", i, Math.ceil(forward.length / CHUNK_SIZE));
          // _chunks.push(Buffer.from([0x00]));
          // console.log("send chunks");
          pStream.response(_chunks);
        } catch (error) {
          console.log("proxy downstream error", error);
          const body = Buffer.from(
            error?.toString ? error.toString() : "unknown error"
          );
          pStream.response([
            encode({ error, bodyLength: body.byteLength }, body),
          ]);
        }
        // });
      }
    },
    {
      maxInboundStreams: 100,
    }
  );

  console.log("libp2p has started");

  console.log(`Node started with id ${node.peerId.toString()}`);
  console.log("Listening on:");
  //  node.getMultiaddrs()
  node.components
    .getAddressManager()
    .getAddresses()
    .forEach((ma) => console.log(ma.toString()));

  await node.start();

  makeRelayStream = relayStreamFactory(node);

  dialRelays(node, makeRelayStream);
  monitorMemory();
}

main();

class RequestStream {
  outbox = [];
  inbox = [];
  hasResponse = Promise.resolve();
  outboxTrigger = () => {
    // noop
  };
  inboxTrigger = () => {
    // noop
  };

  get isOpen() {
    return this.stream.stat.timeline.close === undefined;
  }

  constructor(stream) {
    this.stream = stream;
  }

  async request(chunks) {
    this.outbox = chunks;
    this.outboxTrigger();

    this.inbox = [];
    return bufs;
  }

  close() {
    this.stream.close();
  }

  async request() {
    await new Promise((r) => {
      this.inboxTrigger = r;
    });
    const bufs = this.inbox.map(Buffer.from);
    this.inbox = [];
    return bufs;
  }

  async response(chunks) {
    this.outbox = chunks;
    this.outboxTrigger();
  }

  async open() {
    try {
      this.stream
        .sink(
          (async function* (wrapped) {
            while (true) {
              await new Promise((r) => {
                wrapped.outboxTrigger = r;
              });

              for await (const chunk of wrapped.outbox) {
                // console.log("send chunk", chunk);
                yield chunk;
              }
            }
          })(this)
        )
        .catch((e) => console.log("error in sink", e));

      let currentLength = 0;
      let headLength = 0;
      let totalLength = 0;
      for await (const chunk of this.stream.source) {
        const buf = Buffer.from(chunk.subarray());
        if (buf.byteLength === 1 && buf[0] === 0x00) {
          console.log("ignore null byte");
          continue;
        }
        this.inbox.push(buf);
        if (headLength === 0) {
          // console.log("read buf", buf);
          headLength = buf.readUInt16BE(0) + 2;
        }
        currentLength += buf.length;
        if (totalLength === 0 && currentLength >= headLength) {
          const packet = decode(Buffer.concat(this.inbox));
          totalLength = (packet?.json?.bodyLength ?? 0) + headLength;
        }
        console.log(
          "chunk",
          currentLength,
          headLength,
          totalLength,
          totalLength === 0 && currentLength >= headLength
        );
        if (currentLength === totalLength) {
          currentLength = 0;
          headLength = 0;
          totalLength = 0;
          this.inboxTrigger();
        }
      }

      this.close();
    } catch (e) {
      console.log("error in open", e);
    }
  }
}

class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

class WebsocketStream {
  chunkSize = 1026 * 64;
  outbox = new Deferred();
  inbox = new Deferred();

  get isOpen() {
    return this.stream.stat.timeline.close === undefined;
  }

  constructor(stream) {
    this.stream = stream;
  }

  close() {
    this.stream.close();
  }

  async handleCommand({ body }) {
    try {
      const { method, detail } = JSON.parse(body.toString());
      console.log("handle command", method, detail);
      switch (method) {
        case "OPEN":
          this.openWebsocket(detail);
          break;
        case "CLOSE":
          this.closeWebsocket(detail);
          break;
        default:
          console.log("unknown method", method);
      }
    } catch (error) {
      console.log(body.toString());
    }
  }

  encodeMessageToPacket(type, buffer) {
    return encode({ type, bodyLength: buffer.byteLength }, buffer);
  }

  async openWebsocket({ url, protocols }) {
    console.log("open websocket", url);
    const ws = new WebSocket(url, protocols);
    ws.onopen = (event) => {
      this.sendStatus({ status: "OPENED", detail: event });
    };
    ws.onclose = (event) => {
      this.sendStatus({
        status: "CLOSED",
        detail: {
          code: event[Symbol.for("kCode")],
          wasClean: event[Symbol.for("kWasClean")],
          reason: event[Symbol.for("kReason")],
        },
      });
    };
    ws.onerror = (error) => {
      this.sendStatus({ status: "ERROR", detail: error });
    };
    ws.onmessage = (evt) => {
      // console.log("upstream message", evt.data, JSON.parse(evt.data));
      const body =
        evt.data instanceof Buffer ? evt.data : Buffer.from(evt.data, "ascii");
      const packet = this.encodeMessageToPacket("MESSAGE", body);
      this.send(packet);
    };
    this.ws = ws;
  }

  async sendStatus({ status, detail }) {
    console.log("send status", status, detail);
    const packet = this.encodeMessageToPacket(
      "STATUS",
      Buffer.from(
        JSON.stringify({ status, detail: JSON.parse(JSON.stringify(detail)) })
      )
    );
    this.send(packet);
  }

  async send(data) {
    this.outbox.resolve(data);
    this.outbox = new Deferred();
  }

  async closeWebsocket() {
    this.ws.close();
  }

  handleMessage({ body }) {
    try {
      console.log("handle message", body);
      this.ws.send(body);
    } catch (error) {
      console.log("handleMessage error", error);
    }
  }

  async dispatch(packet) {
    switch (packet.json.type) {
      case "COMMAND":
        return this.handleCommand(packet);
      case "MESSAGE":
        return this.handleMessage(packet);
      default:
        console.warn("invalid packet type", packet.json.type);
    }
  }

  async init() {
    console.log("init websocket stream");
    try {
      const that = this;
      this.stream
        .sink(
          (async function* () {
            while (true) {
              const packet = await that.outbox.promise;

              const parts = [];
              for (
                let i = 0;
                i <= Math.floor(packet.length / that.chunkSize);
                i++
              ) {
                parts.push(
                  packet.subarray(i * that.chunkSize, (i + 1) * that.chunkSize)
                );
              }

              for await (const chunk of parts) {
                // console.log("send chunk", chunk);
                yield chunk;
              }
            }
          })()
        )
        .catch((e) => console.log("error in sink", e));

      let currentLength = 0;
      let headLength = 0;
      let totalLength = 0;
      let inbox = [];
      for await (const chunk of this.stream.source) {
        const buf = Buffer.from(chunk.subarray());
        if (buf.byteLength === 1 && buf[0] === 0x00) {
          console.log("ignore null byte");
          continue;
        }
        inbox.push(buf);
        if (headLength === 0) {
          // console.log("read buf", buf);
          headLength = buf.readUInt16BE(0) + 2;
        }
        currentLength += buf.length;
        let packet;
        if (totalLength === 0 && currentLength >= headLength) {
          packet = decode(Buffer.concat(inbox));
          totalLength = (packet?.json?.bodyLength ?? 0) + headLength;
        }
        if (currentLength === totalLength) {
          packet = packet || decode(Buffer.concat(inbox));
          currentLength = 0;
          headLength = 0;
          totalLength = 0;
          inbox = [];
          this.dispatch(packet);
        }
      }

      this.close();
    } catch (error) {
      console.log("error in init ", error);
    }
  }
}

class RawStream extends EventEmitter {
  readDeferred = new Deferred();
  writeDeferred = new Deferred();

  get isOpen() {
    return this.libp2pStream.stat.timeline.close === undefined;
  }

  get protocol() {
    return this.libp2pStream.stat.protocol;
  }

  constructor(libp2pStream, ports) {
    super();
    this.libp2pStream = libp2pStream;
    this.libp2pStream.sink(this.sink()).catch((e) => console.log("error", e));
    this.source();
  }

  async read() {
    return this.readDeferred.promise.then((data) => {
      // console.trace("read", data);
      return data;
    });
  }

  async write(data) {
    return this._write(data);
  }

  async *sink() {
    let data = null;
    while (this.isOpen && (data = await this.writeDeferred.promise) != null) {
      // console.trace("sink", data);
      yield data;
    }
  }

  _write(data) {
    // console.trace("_write", data);
    this.writeDeferred.resolve(data);
    this.writeDeferred = new Deferred();
  }

  _read(data) {
    // console.trace("_read", data);
    this.readDeferred.resolve(data);
    this.readDeferred = new Deferred();
  }

  async source() {
    try {
      for await (const data of this.libp2pStream.source) {
        this._read(Buffer.from(data.subarray()));
      }
    } catch (e) {
      console.log("error in source", e);
    } finally {
      // console.trace("source", "end");
      this.close();
    }
  }

  close() {
    this.libp2pStream.close();
    this.readDeferred.resolve(null);
    this.writeDeferred.resolve(null);
  }
}

async function justInTimeDNS(hostname) {
  try {
    console.log("jit dns", hostname);
    if (hostname.endsWith(".localhost")) {
      console.log('hostname ends with ".localhost"');
      const hosts = await readFile("/etc/hosts", "utf8");
      console.log("got hosts", hosts, hostname);
      if (!hosts.includes(hostname)) {
        console.log("adding hostname to /etc/hosts", hostname);
        await execProm(`echo "127.0.0.1 ${hostname}" >> /etc/hosts`);
      }
    }
  } catch (e) {
    console.log("error in jit dns", e);
  }
}

const staticLookup = () => async (hostname, _, cb) => {
  if (hostname.endsWith(".localhost")) {
    console.log("intercepting localhost", hostname);
    return cb(null, "127.0.0.1", 4);
  }

  if (hostname.endsWith(".yg")) {
    console.log("intercepting yg", hostname);
    const ip = ygDomainMap.get(hostname);
    if (ip) {
      return cb(null, ip, 4);
    }
  }

  const ips = await dns.resolve(hostname).catch((e) => []);

  if (ips.length === 0) {
    return cb(new Error(`Unable to resolve ${hostname}`));
  }

  cb(null, ips[0], 4);
};

function staticDnsAgent(url) {
  const _u = new URL(url);
  const httpModule = _u.protocol === "http:" ? http : https;
  return new httpModule.Agent({ lookup: staticLookup() });
}
