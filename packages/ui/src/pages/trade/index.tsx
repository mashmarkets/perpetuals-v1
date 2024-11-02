"use client";

import Router from "next/router";
import React, { useEffect } from "react";

import { getTradeRouteFromSymbol } from "@/utils/routes";

const IndexPage = () => {
  useEffect(() => {
    const { pathname } = Router;
    if (pathname == "/trade") {
      Router.push(getTradeRouteFromSymbol("SOL"));
    }
  });

  return <></>;
};

export default IndexPage;
