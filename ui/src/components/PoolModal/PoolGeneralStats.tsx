import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { findPerpetualsAddressSync } from "src/actions/perpetuals";
import { twMerge } from "tailwind-merge";

import { Custody, usePool, usePoolCustodies } from "@/hooks/perpetuals";
import { useBalance, useMint } from "@/hooks/token";
import { formatNumberCommas } from "@/utils/formatters";

const getTradeVolume = (custodies: Custody[]) => {
  return custodies.reduce((acc: number, c) => {
    return (
      acc +
      Object.values(c.volumeStats).reduce(
        (acc, val) => Number(acc) + Number(val),
        0,
      )
    );
  }, 0);
};

const getCollectedFees = (custodies: Custody[]) => {
  return custodies.reduce((acc: number, c) => {
    return (
      acc +
      Object.values(c.collectedFees).reduce(
        (acc, val) => Number(acc) + Number(val),
        0,
      )
    );
  }, 0);
};

const getOiLong = (custodies: Custody[]) =>
  custodies.reduce((acc: number, c) => {
    return acc + Number(c.tradeStats.oiLongUsd);
  }, 0);

export default function PoolGeneralStats({
  className,
  poolKey,
}: {
  poolKey: PublicKey;
  className?: string;
}) {
  const { publicKey } = useWallet();
  const custodies = usePoolCustodies(poolKey);
  const poolData = usePool(poolKey);

  const lpMint = findPerpetualsAddressSync("lp_token_mint", poolKey);
  const mint = useMint(lpMint);
  const lp = useBalance(lpMint, publicKey);

  const userShare =
    lp?.data !== undefined && mint?.data !== undefined
      ? Number(lp?.data) / Number(mint?.data.supply)
      : 0;

  const aum =
    poolData?.data === undefined
      ? 0
      : poolData?.data.aumUsd.toNumber() / 10 ** 6;

  console.log("Custodies: ", custodies);
  return (
    <div
      className={twMerge(
        "grid",
        "grid-cols-4",
        "gap-x-4",
        "gap-y-8",
        className,
      )}
    >
      {[
        {
          label: "Liquidity",
          value: `$${formatNumberCommas(aum)}`,
        },
        {
          label: "Volume",
          value: `$${formatNumberCommas(getTradeVolume(Object.values(custodies)) / 10 ** 6)}`,
        },
        {
          label: "OI Long",
          value: (
            <>
              {`$${formatNumberCommas(getOiLong(Object.values(custodies)) / 10 ** 6)} `}
              <span className="text-zinc-500"> </span>
            </>
          ),
        },
        {
          label: "Fees",
          value: `$${formatNumberCommas(getCollectedFees(Object.values(custodies)) / 10 ** 6)}`,
        },
        {
          label: "Your Liquidity",
          value: `$${formatNumberCommas(aum * userShare)}`,
        },
        {
          label: "Your Share",
          value: `${formatNumberCommas(userShare * 100)}%`,
        },
      ].map(({ label, value }, i) => (
        <div className={twMerge("border-zinc-700", "border-t", "pt-3")} key={i}>
          <div className="text-sm text-zinc-400">{label}</div>
          <div className="text-sm text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}
