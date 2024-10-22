"use client";

import Router from "next/router";
import React, { useEffect } from "react";

import { findPerpetualsAddressSync } from "@/actions/perpetuals";

const IndexPage = () => {
  useEffect(() => {
    const { pathname } = Router;
    if (pathname == "/trade") {
      Router.push(`/trade/${findPerpetualsAddressSync("pool", "WIF")}`);
    }
  });

  return <></>;
};

export default IndexPage;
