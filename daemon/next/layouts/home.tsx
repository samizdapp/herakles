import HomeMobile from "./home.mobile";
import useSWR from "swr";

const fetcher = (...args: [any]) => fetch(...args).then((res) => res.json());

export default function HomeLayout({ children }: any) {
  const { data } = useSWR("/api/harnessed", fetcher);
  const harnessed = data?.harnessed || [];
  return <HomeMobile harnessed={harnessed}>{children}</HomeMobile>;
}
