import Router from "next/router";
import React, { useEffect } from "react";

const IndexPage = () => {
  useEffect(() => {
    const { pathname } = Router;
    if (pathname == "/") {
      Router.push("/trade");
    }
  });

  return <></>;
};

export default IndexPage;
