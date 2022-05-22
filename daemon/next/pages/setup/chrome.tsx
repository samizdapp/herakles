import { useState } from "react";
import BasicLayout from "../../layouts/basic";
import Hostname from "../../components/hostname";
import Trust from "../../components/trust";
import Step from "@mui/material/Step";
import { GetServerSideProps } from "next";
import Stepper from "@mui/material/Stepper";
import StepLabel from "@mui/material/StepLabel";

export default function UnsupportedGuide({ activeStep = "0" }) {
  const [active, _setActive] = useState(activeStep);
  console.log("active step", active);
  const activeNum = Number.parseInt(active);
  return (
    <BasicLayout>
      <Stepper activeStep={activeNum}>
        <Step key={"hostname"} completed={activeNum > 0}>
          <StepLabel>Name</StepLabel>
        </Step>
        <Step key={"trust"} completed={activeNum > 1}>
          <StepLabel>Trust</StepLabel>
        </Step>
      </Stepper>
      {activeNum === 0 ? (
        <Hostname
        // next={(host: string) => {
        //   location.href = `http://${host}.local/setup/chrome?active=1`;
        // }}
        />
      ) : (
        <Trust />
      )}
    </BasicLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const step = query.active || "0";
  return {
    props: {
      activeStep: step,
    },
  };
};
