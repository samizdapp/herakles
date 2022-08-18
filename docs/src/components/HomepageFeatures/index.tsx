import React from "react";
import clsx from "clsx";
import styles from "./styles.module.css";
import { useHistory, useLocation } from "@docusaurus/router";

type FeatureItem = {
  title: string;
  link: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Getting Started",
    link: "/docs/category/getting-started",
    Svg: require("@site/static/img/babel.svg").default,
    description: <>Setup your box and start using SamizdApp.</>,
  },
  {
    title: "Troubleshoot",
    link: "/docs/category/troubleshooting",
    Svg: require("@site/static/img/troubleshoot.svg").default,
    description: <>Find solutions to common problems with running SamizdApp.</>,
  },
  {
    title: "Substack",
    link: "https://www.samizdapp.com/",
    Svg: require("@site/static/img/logo.svg").default,
    description: <>Check out our Substack.</>,
  },
];

function Feature({ title, link, Svg, description }: FeatureItem) {
  const history = useHistory();

  return (
    <div
      className={clsx("col col--4")}
      onClick={() =>
        link.indexOf("http") === 0
          ? window.open(link, "_blank")
          : history.push(link)
      }
    >
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={"row " + styles.row}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
