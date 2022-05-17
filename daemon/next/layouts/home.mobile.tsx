import Drawer from "../components/drawer.mobile";

export default function HomeMobile({ children, harnessed }: any) {
  return (
    <>
      {children}
      <Drawer harnessed={harnessed} />
    </>
  );
}
