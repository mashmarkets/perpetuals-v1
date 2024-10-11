"use client";

import Router from "next/router";
import React, { useEffect } from "react";

const IndexPage = () => {
  useEffect(() => {
    const { pathname } = Router;
    if (pathname == "/trade") {
      Router.push("/trade/SOL-USD");
    }
  });

  return <></>;
};

export default IndexPage;
