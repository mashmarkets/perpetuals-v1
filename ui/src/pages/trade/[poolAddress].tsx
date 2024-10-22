"use client";

import { PublicKey } from "@solana/web3.js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";

import { ChartCurrency } from "@/components/Chart/ChartCurrency";
import { DailyStats } from "@/components/Chart/DailyStats";
import { Positions } from "@/components/Positions";
import { TradeSidebar } from "@/components/TradeSidebar";
import { usePool, usePoolCustodies } from "@/hooks/perpetuals";
import { getTokenInfo, getTradingViewSymbol } from "@/lib/Token";

const safePublicKey = (key: unknown): PublicKey | undefined => {
  try {
    return new PublicKey(key!);
  } catch {
    return undefined;
  }
};

const TradingViewWidget = dynamic(
  () =>
    import("react-ts-tradingview-widgets").then((x) => x.AdvancedRealTimeChart),
  {
    ssr: false,
  },
);

export default function Page() {
  const router = useRouter();
  const { poolAddress } = router.query;
  const pool = usePool(safePublicKey(poolAddress));
  const custodies = usePoolCustodies(safePublicKey(poolAddress));
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
            symbol={getTradingViewSymbol(mint)}
            theme="dark"
          />
          <div className="items-center text-center">
            <a
              href={`https://www.tradingview.com/symbols/${getTradingViewSymbol(
                mint,
              )}/?exchange=COINBASE`}
              className="text-xs text-white underline"
            >
              {getTokenInfo(mint).symbol} chart
            </a>
            <span className="text-xs text-white"> by TradingView</span>
          </div>
        </div>
        <Positions className="mt-12" />
      </div>
      <div className="max-w-lg">
        <TradeSidebar mint={mint} poolAddress={new PublicKey(poolAddress)} />
      </div>
    </div>
  );
}
