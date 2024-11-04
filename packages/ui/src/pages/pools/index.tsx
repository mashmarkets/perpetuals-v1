"use client";

import { ChartCandlestick } from "@carbon/icons-react";
import { Address } from "@solana/addresses";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { twMerge } from "tailwind-merge";

import { findPerpetualsAddressSync } from "@/actions/perpetuals";
import {
  useAllPools,
  useGetAssetsUnderManagement,
  useMultipleGetAssetsUnderManagement,
  usePool,
  usePoolCustodies,
} from "@/hooks/perpetuals";
import { useBalance, useGetTokenInfo, useMint } from "@/hooks/token";
import { USD_POWER } from "@/lib/types";
import { formatNumberCommas } from "@/utils/formatters";

function PoolRow({ poolAddress }: { poolAddress: Address }) {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { getTokenSymbol, getTokenIcon } = useGetTokenInfo();
  const { data: pool } = usePool(poolAddress);
  const custodies = usePoolCustodies(poolAddress);
  const { data: aum } = useGetAssetsUnderManagement(pool);

  const lpMint = findPerpetualsAddressSync("lp_token_mint", poolAddress);
  const mint = useMint(lpMint);
  const lp = useBalance(lpMint, publicKey === null ? undefined : publicKey);
  const tokenIcon = getTokenIcon(Object.values(custodies)?.[0]?.mint);

  const userShare = Number(lp?.data) / Number(mint.data?.supply);
  const tradeVolume = Object.values(custodies).reduce((acc: number, c) => {
    return (
      acc +
      Object.values(c.volumeStats ?? {}).reduce(
        (acc, val) => Number(acc) + Number(val),
        0,
      )
    );
  }, 0);
  const collectedFees = Object.values(custodies).reduce((acc: number, c) => {
    return (
      acc +
      Object.values(c.collectedFees ?? {}).reduce(
        (acc, val) => Number(acc) + Number(val),
        0,
      )
    );
  }, 0);

  const oiLong = Object.values(custodies).reduce((acc: number, c) => {
    return acc + Number(c.tradeStats.oiLongUsd);
  }, 0);
  if (pool === undefined) {
    return <></>;
  }
  return (
    <tr
      className="cursor-pointer border-b border-zinc-700 text-xs hover:bg-zinc-800"
      key={pool?.name}
      onClick={() => router.push(`/pools/${poolAddress.toString()}`)}
    >
      <td className="px-2 py-4">
        <div className="flex flex-row items-center space-x-1">
          <div className="h-6 w-6">{tokenIcon}</div>
          <div>
            <p className="text-xs font-medium">{pool?.name}</p>
            <div className="flex flex-row truncate text-xs font-medium text-zinc-500">
              {Object.values(custodies)
                .map((x) => getTokenSymbol(x.mint))
                .join(", ")}
            </div>
          </div>
        </div>
      </td>
      <td>${formatNumberCommas(Number(aum) / USD_POWER)}</td>
      <td>${formatNumberCommas(tradeVolume / USD_POWER)}</td>
      <td>${formatNumberCommas(collectedFees / USD_POWER)}</td>
      <td>${formatNumberCommas(oiLong / USD_POWER)}</td>
      <td>
        {userShare
          ? "$" + formatNumberCommas(userShare * (Number(aum) / USD_POWER))
          : "-"}
      </td>
      <td>{userShare ? formatNumberCommas(userShare * 100) + "%" : "-"}</td>
    </tr>
  );
}
export default function Pools() {
  const pools = useAllPools();
  const aums = useMultipleGetAssetsUnderManagement(Object.values(pools ?? {}));
  const tvl = Object.values(aums ?? {}).reduce((acc, aum) => {
    return acc + aum;
  }, BigInt(0));

  return (
    <div className="px-16 py-6">
      <div className="flex items-baseline space-x-3 pb-8">
        <h1 className="m-0 text-4xl text-white">Liquidity Pools</h1>
        <div className="flex flex-row space-x-2 text-sm">
          <p className="text-zinc-500">TVL</p>
          <p className="text-white">
            {tvl && "$" + formatNumberCommas(Number(tvl) / USD_POWER)}
          </p>
        </div>
      </div>

      {Object.values(pools).length === 0 ? (
        <div className="flex flex-col items-center space-y-2 rounded-md bg-zinc-900 py-5">
          <ChartCandlestick className="h-5 w-5 fill-zinc-500" />
          <p className="text-sm font-normal text-zinc-500">No Open Pools</p>
        </div>
      ) : (
        <table className={twMerge("table-auto", "text-white", "w-full")}>
          <thead
            className={twMerge(
              "text-xs",
              "text-zinc-500",
              "border-b",
              "border-zinc-700",
              "pb-2",
            )}
          >
            <tr className="">
              <td className="py-3">Pool name</td>
              <td>Liquidity</td>
              <td>Volume</td>
              <td>Fees</td>
              <td>OI Long</td>
              <td>Your Liquidity</td>
              <td>Your Share</td>
            </tr>
          </thead>
          <tbody>
            {Object.values(pools ?? {}).map((pool) => (
              <PoolRow key={pool.address} poolAddress={pool.address} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
