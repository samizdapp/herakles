// @ts-ignore
import { useRouter } from "next/router";

export default function HarnessedPage() {
  const {
    query: { dir },
  } = useRouter();

  return (
    <iframe
      src={`/harness/${dir}/`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: "100%",
        height: "100%",
        border: "none",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        zIndex: 999999,
      }}
    >
      Your browser doesn't support iframes
    </iframe>
  );
}
