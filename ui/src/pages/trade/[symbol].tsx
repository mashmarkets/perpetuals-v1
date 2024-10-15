"use client";

import { useRouter } from "next/router";

import { CandlestickChart } from "@/components/Chart/CandlestickChart";
import { Positions } from "@/components/Positions";
import { TradeSidebar } from "@/components/TradeSidebar";
import { asToken, TokenE } from "@/lib/Token";

export default function Page() {
  const router = useRouter();
  const { symbol } = router.query;

  if (typeof symbol !== "string") {
    return <></>;
  }
  // if (!symbol) {
  // }

  // // @ts-ignore
  // let token: ReturnType<typeof getToken> = asToken(symbol.split("-")[0]);
  const token = asToken(symbol as string);
  const currency = "usd";

  return (
    <div className="mx-auto w-full max-w-[1550px] flex-row-reverse px-4 pt-11 lg:grid lg:grid-cols-[900px,1fr] lg:gap-x-16 lg:px-16">
      <div>
        <CandlestickChart comparisonCurrency={currency} token={token} />
        <Positions className="mt-8" />
      </div>
      <TradeSidebar token={token} />
    </div>
  );
}
