import useSwr from "swr";
import { useEffect, useState } from "react";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import FavoriteIcon from "@mui/icons-material/Favorite";
import Paper from "@mui/material/Paper";
import Link from "next/link";

const fetcher = (...args: [any]) => fetch(...args).then((res) => res.json());

export default function Home() {
  const { data: time, error: timeError } = useSwr("/api/time", fetcher, {
    refreshInterval: 1000,
  });
  const { data: addresses, error: addressError } = useSwr(
    "/api/addresses",
    fetcher,
    { refreshInterval: 2000 }
  );
  const [tried, setTried] = useState("");
  const [preferred, setPreferred] = useState("");
  const [log, setLog] = useState([""]);

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
    <>
      <div>
        <main>
          <h1>Herakles</h1>

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

        <Paper
          sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
          elevation={3}
        >
          <BottomNavigation showLabels>
            <Link href="/harness/cinny">
              <BottomNavigationAction
                label="Favorites"
                icon={<FavoriteIcon />}
              />
            </Link>
          </BottomNavigation>
        </Paper>
      </div>
    </>
  );
}
