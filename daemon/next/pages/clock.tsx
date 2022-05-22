import useSwr from "swr";
import { useEffect, useState } from "react";
import HomeLayout from "../layouts/home";
import TextField from "@mui/material/TextField";

const fetcher = (...args: [any]) => fetch(...args).then((res) => res.json());

export default function Home() {
  const { data: time, error: timeError } = useSwr("/api/time", fetcher, {
    refreshInterval: 10000,
  });
  const { data: addresses, error: addressError } = useSwr(
    "/api/addresses",
    fetcher,
    { refreshInterval: 10000 }
  );
  const [tried, setTried] = useState("");
  const [preferred, setPreferred] = useState("");
  const [log, setLog] = useState([""]);
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    if (hostname) {
      console.log("hostname change", hostname);
      const updateHostname = async (hostname: string) => {
        await fetch("/api/hostname", {
          method: "POST",
          body: JSON.stringify({ hostname }),
        });
      };
      updateHostname(hostname).catch(console.error);
    }
  }, [hostname]);

  useEffect(() => {
    const broadcast = new BroadcastChannel("address-channel");
    broadcast.onmessage = (event) => {
      if (event.data.type === "TRY_ADDRESSES") {
        setTried(JSON.stringify(event.data, null, 2));
      } else if (event.data.type === "PREFERRED_ADDRESS") {
        setPreferred(event.data.preferred);
      } else if (event.data.type === "TRIED_ADDRESS") {
        const msg = `${event.data.nonce} tried address ${event.data.addr}`;
        setLog([msg].concat(log));
      } else if (event.data.type === "TRIED_ADDRESS_ERROR") {
        const msg = `${event.data.nonce} error on address ${event.data.addr}: ${event.data.error}`;
        setLog([msg].concat(log));
      }
    };
    return () => broadcast.close();
  }, [log]);
  const d = new Date(time?.time || undefined);
  const clock = `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
  const connection = `${
    preferred.indexOf("sam") === 0
      ? "Wifi Access Point"
      : preferred.indexOf("192") === 0
      ? "LAN"
      : "WAN"
  }`;

  return (
    <HomeLayout>
      <div>
        <main>
          <h1>Herakles still after build?</h1>
          <TextField
            id="filled-basic"
            label="Filled"
            variant="filled"
            onChange={(e) => setHostname(e.target.value)}
          />
          <p>{timeError ? timeError.toString() : clock}</p>
          <p>
            Connected via {connection}: {preferred}
          </p>
          <pre>
            {addressError
              ? addressError.toString()
              : JSON.stringify(addresses?.addresses, null, 2)}
          </pre>
          <pre>{preferred}</pre>
          <pre>{tried}</pre>
          <pre>{log.join("\n")}</pre>
        </main>
      </div>
    </HomeLayout>
  );
}
