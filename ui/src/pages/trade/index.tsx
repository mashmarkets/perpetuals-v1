"use client";

import Router from "next/router";
import React, { useEffect } from "react";

const IndexPage = () => {
  useEffect(() => {
    const { pathname } = Router;
    if (pathname == "/trade") {
      Router.push("/trade/mSOL");
    }
  });

  return <></>;
};

export default IndexPage;
