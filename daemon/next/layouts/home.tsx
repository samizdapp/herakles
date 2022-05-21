import HomeMobile from "./home.mobile";
import Basic from "./basic";
import useSWR from "swr";

const fetcher = (...args: [any]) => fetch(...args).then((res) => res.json());

export default function HomeLayout({ children }: any) {
  const { data } = useSWR("/api/harnessed", fetcher);
  const harnessed = data?.harnessed || [];
  return (
    <HomeMobile harnessed={harnessed}>
      <Basic>{children}</Basic>
    </HomeMobile>
  );
}
