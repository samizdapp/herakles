import { useEffect, useState } from "react";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import useSWR from "swr";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const fetcher = (url: any) => fetch(url).then((r) => r.json());

const statuses = [
  "UNCHANGED",
  "CHANGING",
  "UPDATING",
  "PINGING",
  "SUCCESS",
  "ERROR",
];

function getStatusText(status: string) {
  const idx = statuses.indexOf(status);

  switch (idx) {
    case 0:
    case 4:
      return "";
    case 1:
      return "monitoring changes...";
    case 2:
      return "updating name on device";
    case 3:
      return "checking connectivity";
    case 5:
      return "something went wrong";
    default:
      throw new Error("invalid status");
  }
}

const wait = async (ms = 2000) => new Promise((r) => setTimeout(r, ms));

const canPingHost = async (host: string, timeout = 600000) => {
  const start = Date.now();

  do {
    const res = await fetch(`http://${host}.local/api/ping`).catch((e) => {
      console.log(e);
      return null;
    });

    if (res?.status === 200) return true;
    await wait();
  } while (Date.now() < start + timeout);

  throw new Error(`unable to ping new host: ${host}.local`);
};

export default function HostnameUpdater() {
  const { data: hostData, error: _swrError } = useSWR("/api/hostname", fetcher);
  const hostname = hostData?.hostname;
  const [currentHost, setCurrentHost] = useState(hostname);
  const [newhost, setNewhost] = useState("");
  const [status, setStatus] = useState(statuses[0]);
  const [_error, setError] = useState(null);

  const step = statuses.indexOf(status);
  const percent = Math.round((step / (statuses.length - 2)) * 100);

  useEffect(() => {
    let isSubscribed = true;

    if (newhost) {
      setStatus(statuses[1]);

      const updateHost = async () => {
        await wait();

        let data;
        if (isSubscribed) {
          setStatus(statuses[2]);
          data = await fetch("/api/hostname", {
            method: "PUT",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ hostname: newhost }),
          }).catch((e) => {
            console.log(e);
          });
        }

        let pinged;
        if (isSubscribed && data?.status === 200) {
          setStatus(statuses[3]);
          pinged = await canPingHost(newhost);
        }

        if (isSubscribed && pinged) {
          setStatus(statuses[4]);
          setCurrentHost(newhost);
        }
      };

      updateHost().catch((e: any) => {
        if (isSubscribed) {
          setStatus(statuses[statuses.length - 1]);
          setError(e);
        }
      });
    }

    return () => {
      isSubscribed = false;
    };
  }, [newhost]);
  return (
    <Grid
      container
      spacing={2}
      direction="column"
      justifyContent="center"
      alignItems={"center"}
    >
      <Grid item xs={12}>
        <Typography align="center" variant="h4">
          Device Name
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography align="center" variant="subtitle1">
          choose a name for this device
        </Typography>
      </Grid>
      <Grid item xs={12}>
        {currentHost ? (
          <Typography align="center" variant="subtitle2">
            Current: {currentHost}
          </Typography>
        ) : (
          <Skeleton variant="text" />
        )}
      </Grid>
      <Grid item xs={4}>
        <div>
          <TextField
            autoFocus={true}
            label="New Name"
            disabled={!hostname}
            onChange={(event) => setNewhost(event.target.value)}
            helperText={getStatusText(status)}
          />
        </div>
      </Grid>

      <Grid item xs={12}>
        <Collapse in={step !== 0 && percent < 100}>
          <CircularProgress variant="determinate" value={percent} />
        </Collapse>
      </Grid>

      <Grid item xs={12}>
        <Collapse in={percent === 100}>
          <CheckCircleOutlineIcon color={"success"} fontSize={"large"} />
        </Collapse>
      </Grid>
      <Grid item xs={12}>
        <Collapse in={percent === 100}>
          <Button
            variant={"contained"}
            onClick={() => navigator.share({ url: "chrome://flags" })}
          >
            Next
          </Button>
        </Collapse>
      </Grid>
    </Grid>
  );
}
