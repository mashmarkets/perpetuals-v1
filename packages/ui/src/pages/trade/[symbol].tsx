"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";

import { findPerpetualsAddressSync } from "@/actions/perpetuals";
import { ChartCurrency } from "@/components/Chart/ChartCurrency";
import { DailyStats } from "@/components/Chart/DailyStats";
import { OrderHistory } from "@/components/OrderHistory";
import { ExistingPositions } from "@/components/Positions/ExistingPositions";
import { TradeSidebar } from "@/components/TradeSidebar";
import { usePool, usePoolCustodies } from "@/hooks/perpetuals";
import { useGetTokenInfo } from "@/hooks/token";
import { isValidSymbol } from "@/lib/Token";

const TradingViewWidget = dynamic(
  () =>
    import("react-ts-tradingview-widgets").then((x) => x.AdvancedRealTimeChart),
  {
    ssr: false,
  },
);

export default function Page() {
  const router = useRouter();
  const poolAddress = isValidSymbol(router.query.symbol)
    ? findPerpetualsAddressSync("pool", router.query.symbol as string)
    : undefined;

  const { getTokenInfo } = useGetTokenInfo();
  const pool = usePool(poolAddress);
  const custodies = usePoolCustodies(poolAddress);
  const mint = Object.values(custodies)[0]?.mint;

  if (pool.isFetched && pool.data === null) {
    return (
      <>
        <div className="mx-auto max-w-xl pt-16 text-center">
          <p className="text-2xl text-white">
            This pool does not exist. Do you want to create?
          </p>
          <Link href="/list" as={`/list`}>
            <div className="pt-4 text-center text-lg text-slate-400">
              List ↗
            </div>
          </Link>
        </div>
      </>
    );
  }
  if (typeof poolAddress !== "string" || mint === undefined) {
    return <></>;
  }

  return (
    <>
      <div className="mx-auto flex w-full flex-row justify-center px-4 pt-11 lg:grid lg:grid-cols-[1fr,max-content] lg:gap-x-16 lg:px-16">
        <div>
          <div className="mb-8 flex items-center">
            <ChartCurrency mint={mint} />
            <DailyStats className="ml-12" mint={mint} />
            <Link href="/pools/[poolAddress]" as={`/pools/${poolAddress}`}>
              <div className="rounded-lg px-4 py-2 pl-6 pt-4 text-sm text-slate-400">
                Earn ↗
              </div>
            </Link>
          </div>
          <div className="h-[350px] md:h-[700px]">
            <TradingViewWidget
              autosize
              symbol={getTokenInfo(mint)?.extensions.tradingView}
              theme="dark"
              allow_symbol_change={false}
            />
          </div>
        </div>
        <div className="max-w-lg">
          <TradeSidebar mint={mint} poolAddress={poolAddress} />
        </div>
      </div>
      <div className="mx-auto px-4 py-8 lg:px-16">
        <header className="space-x-46 mb-5 mt-20 flex items-center">
          <div className="font-medium text-white">My Positions</div>
        </header>
        <ExistingPositions />
        <header className="space-x-46 mb-5 mt-20 flex items-center">
          <div className="font-medium text-white">Trade History </div>
        </header>
        <OrderHistory poolAddress={poolAddress} />
      </div>
    </>
  );
}
