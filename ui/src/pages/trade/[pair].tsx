"use client";

import { useRouter } from "next/router";

import { CandlestickChart } from "@/components/Chart/CandlestickChart";
import { TradeLayout } from "@/components/Layouts/TradeLayout";
import { Positions } from "@/components/Positions";
import { TradeSidebar } from "@/components/TradeSidebar";
import { asToken } from "@/lib/Token";

function getToken(pair: string) {
  const [token, _] = pair.split("-");
  return asToken(token || "");
}

function getComparisonCurrency() {
  return "usd" as const;
}

export default function Page() {
  const router = useRouter();
  const { pair } = router.query;

  if (!pair) {
    return <></>;
  }

  // @ts-ignore
  let token: ReturnType<typeof getToken> = asToken(pair.split("-")[0]);
  let currency: ReturnType<typeof getComparisonCurrency> =
    getComparisonCurrency();

  if (pair && Array.isArray(pair)) {
    const tokenAndCurrency = pair[0];

    if (tokenAndCurrency) {
      token = getToken(tokenAndCurrency);
      currency = getComparisonCurrency();
    }
  }

  return (
    <TradeLayout className="pt-11">
      <div>
        <TradeSidebar />
      </div>
      <div>
        <CandlestickChart comparisonCurrency={currency} token={token} />
        <Positions className="mt-8" />
      </div>
    </TradeLayout>
  );
}
