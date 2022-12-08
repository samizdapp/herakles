#!/usr/bin/env node

import { createLibp2p } from "libp2p";
import { WebSockets } from "@libp2p/websockets";
import { Noise } from "@chainsafe/libp2p-noise";
import { Mplex } from "@libp2p/mplex";

const MULTI_ADDR = process.argv[2];

async function main() {
  const nodeAddr = MULTI_ADDR;

  if (!nodeAddr) {
    throw new Error("Node address is required.");
  }
  const node = await createLibp2p({
    transports: [new WebSockets()],
    connectionEncryption: [new Noise()],
    streamMuxers: [new Mplex()],
    connectionManager: {
      dialTimeout: 60000,
      autoDial: false,
    },
  });

  node.connectionManager.addEventListener("peer:connect", (evt) => {
    const connection = evt.detail;
    console.log(`Connected to ${connection.remotePeer.toString()}`);
    // console.log(connection);
  });

  node.connectionManager.addEventListener("peer:disconnect", (evt) => {
    const connection = evt.detail;
    console.log(`disconnected from ${connection.remotePeer.toString()}`);
    // console.log(connection);
  });

  node.addEventListener("peer:discovery", (evt) => {
    console.log("peer:discovery", evt);
  });

  await node.start();

  while (true) {
    console.log(`Node started with id ${node.peerId.toString()}`);

    const conn = await node.dialProtocol(nodeAddr, "/samizdapp-heartbeat");

    console.log(`Connected to the node via `, conn);
    for await (const msg of conn.source) {
      console.log(
        "received message: ",
        Buffer.from(msg.subarray()).toString("hex")
      );
    }

    console.log("Connection closed");
  }

  return 0;
}

await main();

process.exit(0);
