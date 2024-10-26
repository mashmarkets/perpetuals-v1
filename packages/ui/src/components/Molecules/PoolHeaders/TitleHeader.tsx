import NewTab from "@carbon/icons-react/lib/NewTab";
import { Address } from "@solana/addresses";
import { twMerge } from "tailwind-merge";

import TokenIconArray from "@/components/ui/TokenIconArray";
import { usePool, usePoolCustodies } from "@/hooks/perpetuals";
import { getTokenSymbol } from "@/lib/Token";
import { ACCOUNT_URL } from "@/utils/TransactionHandlers";

export function TitleHeader({
  poolAddress,
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
  poolAddress: Address;
}) {
  const { data: pool } = usePool(poolAddress);
  const custodies = usePoolCustodies(poolAddress);

  return (
    <div className={twMerge("flex", "flex-col", "space-x-1", className)}>
      <div className="flex flex-row items-center">
        <TokenIconArray
          tokens={Object.values(custodies ?? {}).map((x) => x.mint)}
          className={iconClassName}
        />
        <p className={twMerge("font-medium", "text-2xl")}>{pool?.name ?? ""}</p>
        <a
          target="_blank"
          rel="noreferrer"
          href={`${ACCOUNT_URL(pool?.address.toString() ?? "")}`}
        >
          <NewTab />
        </a>
      </div>
      <div className="text-s mt-3 flex flex-row font-medium text-zinc-500">
        <p>
          {Object.values(custodies ?? {})
            .map((x) => getTokenSymbol(x.mint))
            .join(", ")}
        </p>
      </div>
    </div>
  );
}
