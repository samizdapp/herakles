import { useEffect, useState } from "react";
import HomeLayout from "../layouts/home";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import { GetServerSideProps } from "next";
import { isSupportedPlatform } from "../lib/support";
import platform from "platform";

export default function Home() {
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    if (hostname) {
      const updateHostname = async (hostname: string) => {
        await fetch("/api/hostname", {
          method: "POST",
          body: JSON.stringify({ hostname }),
        });
      };
      updateHostname(hostname).catch(console.error);
    }
  }, [hostname]);

  return (
    <HomeLayout>
      <Card>
        <h1>Welcome</h1>
        <p>{JSON.stringify(platform)}</p>
        <TextField
          id="filled-basic"
          label="Filled"
          variant="filled"
          onChange={(e) => setHostname(e.target.value)}
        />
      </Card>
    </HomeLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const p = platform.parse(context.req.headers["user-agent"]);
  const supported = isSupportedPlatform(p);
  if (!supported) {
    return {
      redirect: {
        destination: "/setup/unsupported",
        permanent: false,
      },
    };
  }

  const hostname = context.req.headers.host;
  if (hostname === "setup.local") {
    const guide = p.name === "Safari" ? "safari" : "chrome";
    return {
      redirect: {
        destination: `/setup/${guide}`,
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
