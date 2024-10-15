"use client";

import { PublicKey } from "@metaplex-foundation/js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { findPerpetualsAddressSync } from "src/actions/perpetuals";
import { twMerge } from "tailwind-merge";

import { NoPositions } from "@/components/Positions/NoPositions";
import { useAllPools, useCustodies, usePool } from "@/hooks/perpetuals";
import { useBalance, useMint } from "@/hooks/token";
import { getTokenIcon, tokens } from "@/lib/Token";
import { formatNumberCommas } from "@/utils/formatters";

function PoolRow({ poolKey }: { poolKey: string }) {
  const { publicKey } = useWallet();
  const router = useRouter();
  const pool = usePool(new PublicKey(poolKey));
  const custodies = useCustodies(
    pool.data?.custodies.map((x) => new PublicKey(x))!,
  );

  const lpMint = findPerpetualsAddressSync(
    "lp_token_mint",
    new PublicKey(poolKey),
  );
  const mint = useMint(lpMint);
  const lp = useBalance(lpMint, publicKey === null ? undefined : publicKey);
  const tokenIcon = getTokenIcon(custodies?.[0]?.data?.mint);

  const userShare = Number(lp?.data) / Number(mint.data?.supply);
  const tradeVolume = custodies.reduce((acc: number, c) => {
    return (
      acc +
      Object.values(c.data?.volumeStats ?? {}).reduce(
        (acc, val) => Number(acc) + Number(val),
        0,
      )
    );
  }, 0);
  const collectedFees = custodies.reduce((acc: number, c) => {
    return (
      acc +
      Object.values(c.data?.collectedFees ?? {}).reduce(
        (acc, val) => Number(acc) + Number(val),
        0,
      )
    );
  }, 0);

  const oiLong = custodies.reduce((acc: number, c) => {
    return acc + Number(c.data?.tradeStats.oiLongUsd);
  }, 0);

  return (
    <tr
      className="cursor-pointer border-b border-zinc-700 text-xs hover:bg-zinc-800"
      key={pool.data?.name}
      onClick={() => router.push(`/pools/${poolKey.toString()}`)}
    >
      <td className="px-2 py-4">
        <div className="flex flex-row items-center space-x-1">
          <div className="h-6 w-6">{tokenIcon}</div>
          <div>
            <p className="text-xs font-medium">{pool.data?.name}</p>
            <div className="flex flex-row truncate text-xs font-medium text-zinc-500">
              {custodies
                .filter((x) => x.data !== undefined)
                .map((x) => tokens[x.data!.mint.toString()]!.symbol)
                .join(", ")}
            </div>
          </div>
        </div>
      </td>
      <td>${formatNumberCommas(pool.data?.aumUsd.toNumber() / 10 ** 6)}</td>
      <td>${formatNumberCommas(tradeVolume / 10 ** 6)}</td>
      <td>${formatNumberCommas(collectedFees / 10 ** 6)}</td>
      <td>${formatNumberCommas(oiLong / 10 ** 6)}</td>
      <td>
        {userShare
          ? "$" +
            formatNumberCommas(
              (userShare * pool.data?.aumUsd.toNumber()) / 10 ** 6,
            )
          : "-"}
      </td>
      <td>{userShare ? formatNumberCommas(userShare * 100) + "%" : "-"}</td>
    </tr>
  );
}
export default function Pools() {
  const pools = useAllPools();

  if (!pools.isFetched) {
    return <p className="text-white">Loading...</p>;
  }

  return (
    <div className="px-16 py-6">
      <div className="flex items-baseline space-x-3 pb-8">
        <h1 className="m-0 text-4xl text-white">Liquidity Pools</h1>
        <div className="flex flex-row space-x-2 text-sm">
          <p className="text-zinc-500">TVL</p>
          <p className="text-white">
            $
            {formatNumberCommas(
              Object.values(pools.data!).reduce((acc, pool) => {
                return acc + Number(pool.aumUsd.toNumber() / 10 ** 6);
              }, 0),
            )}
          </p>
        </div>
      </div>

      {Object.values(pools.data!).length === 0 ? (
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
            {Object.entries(pools.data!).map(([poolKey, pool]) => (
              <PoolRow key={poolKey} poolKey={poolKey} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
