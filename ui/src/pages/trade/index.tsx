"use client";

import Router from "next/router";
import React, { useEffect } from "react";
import { findPerpetualsAddressSync } from "src/actions/perpetuals";

const IndexPage = () => {
  useEffect(() => {
    const { pathname } = Router;
    if (pathname == "/trade") {
      Router.push(`/trade/${findPerpetualsAddressSync("pool", "JitoSOL")}`);
    }
  });

  return <></>;
};

export default IndexPage;
