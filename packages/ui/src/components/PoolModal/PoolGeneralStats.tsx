import { Address } from "@solana/addresses";
import { useWallet } from "@solana/wallet-adapter-react";
import { twMerge } from "tailwind-merge";

import { findPerpetualsAddressSync } from "@/actions/perpetuals";
import {
  Custody,
  useGetAssetsUnderManagement,
  usePool,
  usePoolCustodies,
} from "@/hooks/perpetuals";
import { useBalance, useMint } from "@/hooks/token";
import { USD_POWER } from "@/lib/types";
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
  poolAddress,
}: {
  poolAddress: Address;
  className?: string;
}) {
  const { publicKey } = useWallet();
  const custodies = usePoolCustodies(poolAddress);
  const { data: pool } = usePool(poolAddress);
  const { data: aum } = useGetAssetsUnderManagement(pool);

  const lpMint = findPerpetualsAddressSync("lp_token_mint", poolAddress);
  const { data: mint } = useMint(lpMint);
  const { data: lp } = useBalance(lpMint, publicKey);

  const userShare = !!lp && !!mint ? Number(lp) / Number(mint.supply) : 0;

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
          value: `$${formatNumberCommas(Number(aum) / USD_POWER)}`,
        },
        {
          label: "Volume",
          value: `$${formatNumberCommas(getTradeVolume(Object.values(custodies)) / USD_POWER)}`,
        },
        {
          label: "OI Long",
          value: (
            <>
              {`$${formatNumberCommas(getOiLong(Object.values(custodies)) / USD_POWER)} `}
              <span className="text-zinc-500"> </span>
            </>
          ),
        },
        {
          label: "Fees",
          value: `$${formatNumberCommas(getCollectedFees(Object.values(custodies)) / USD_POWER)}`,
        },
        {
          label: "Your Liquidity",
          value: `$${formatNumberCommas((Number(aum) / USD_POWER) * userShare)}`,
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
