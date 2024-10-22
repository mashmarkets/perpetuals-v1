"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { twMerge } from "tailwind-merge";

import { findPerpetualsAddressSync } from "@/actions/perpetuals";
import { NoPositions } from "@/components/Positions/NoPositions";
import {
  useAllPools,
  useGetAssetsUnderManagement,
  useMultipleGetAssetsUnderManagement,
  usePool,
  usePoolCustodies,
} from "@/hooks/perpetuals";
import { useBalance, useMint } from "@/hooks/token";
import { getTokenIcon, tokens } from "@/lib/Token";
import { formatNumberCommas } from "@/utils/formatters";

function PoolRow({ poolAddress }: { poolAddress: PublicKey }) {
  const { publicKey } = useWallet();
  const router = useRouter();
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
                .map((x) => tokens[x.mint.toString()]!.symbol)
                .join(", ")}
            </div>
          </div>
        </div>
      </td>
      <td>${formatNumberCommas(Number(aum) / 10 ** 6)}</td>
      <td>${formatNumberCommas(tradeVolume / 10 ** 6)}</td>
      <td>${formatNumberCommas(collectedFees / 10 ** 6)}</td>
      <td>${formatNumberCommas(oiLong / 10 ** 6)}</td>
      <td>
        {userShare
          ? "$" + formatNumberCommas((userShare * Number(aum)) / 10 ** 6)
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
            {tvl && "$" + formatNumberCommas(Number(tvl) / 10 ** 6)}
          </p>
        </div>
      </div>

      {Object.values(pools).length === 0 ? (
        <NoPositions emptyString="No Open Pools" />
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
            {Object.keys(pools ?? {}).map((poolAddress) => (
              <PoolRow
                key={poolAddress.toString()}
                poolAddress={new PublicKey(poolAddress)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
