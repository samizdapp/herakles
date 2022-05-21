import { Typography } from "@mui/material";
import { getSupportedPlatform } from "../../lib/support";
import BasicLayout from "../../layouts/basic";
import platform from "platform";

export default function UnsupportedGuide() {
  const recommend = getSupportedPlatform();
  return (
    <BasicLayout>
      <Typography align="center" variant="h4">
        Unsupported Browser
      </Typography>
      <Typography align="center" variant="subtitle2">
        please use {recommend} browser on {platform?.os?.family}
      </Typography>
    </BasicLayout>
  );
}
