import CheckmarkIcon from "@carbon/icons-react/lib/Checkmark";
import ChevronDownIcon from "@carbon/icons-react/lib/ChevronDown";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Address } from "@solana/addresses";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import TokenIconArray from "@/components/ui/TokenIconArray";
import { useAllPools, useCustodies } from "@/hooks/perpetuals";
import { useGetTokenInfo } from "@/hooks/token";
import { dedupe } from "@/utils/utils";

interface Props {
  className?: string;
  poolAddress: Address;
  onSelectPool?(poolAddress: Address): void;
}

export function PoolSelector(props: Props) {
  const { poolAddress } = props;
  const [open, setOpen] = useState(false);

  const pools = useAllPools();
  const custodies = useCustodies(
    dedupe(Object.values(pools ?? {}).flatMap((x) => x.custodies)),
  );

  const { getTokenSymbol } = useGetTokenInfo();

  const selectedPool = pools?.[poolAddress.toString()];
  const getTokenList = (address: Address) =>
    (pools?.[address.toString()]?.custodies ?? [])
      .map((x) => custodies[x]?.mint)
      .filter((x) => x !== undefined);

  return (
    <Dropdown.Root open={open} onOpenChange={setOpen}>
      <Dropdown.Trigger
        className={twMerge(
          "bg-zinc-900",
          "gap-x-1",
          "grid-cols-[24px,1fr,24px]",
          "grid",
          "group",
          "h-11",
          "items-center",
          "px-4",
          "rounded",
          "text-left",
          "w-full",
          props.className,
        )}
      >
        <TokenIconArray
          tokens={getTokenList(poolAddress)}
          className="h-5 w-5"
        />
        <div className="truncate text-sm font-medium text-white">
          {selectedPool?.name}
        </div>
        <div
          className={twMerge(
            "bg-zinc-900",
            "grid-cols-[24px,1fr,24px]",
            "grid",
            "h-8",
            "items-center",
            "px-4",
            "rounded",
            "text-left",
            "w-full",
          )}
        >
          <ChevronDownIcon className="fill-slate-500 transition-colors group-hover:fill-white" />
        </div>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          sideOffset={8}
          className="w-[392px] overflow-hidden rounded bg-zinc-900 shadow-2xl"
        >
          <Dropdown.Arrow className="fill-zinc-900" />
          {Object.values(pools ?? {}).map((pool) => {
            const tokenList = getTokenList(pool.address);
            return (
              <Dropdown.Item
                className={twMerge(
                  "cursor-pointer",
                  "gap-x-1",
                  "grid-cols-[24px,1fr,24px]",
                  "grid",
                  "group",
                  "items-center",
                  "px-4",
                  "py-2.5",
                  "text-left",
                  "transition-colors",
                  "w-full",
                  "hover:bg-zinc-700",
                )}
                key={pool.address.toString()}
                onClick={() => props.onSelectPool?.(pool.address)}
              >
                <TokenIconArray tokens={tokenList} className="h-5 w-5" />
                <div>
                  <div className="truncate text-sm font-medium text-white">
                    {pool.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {tokenList.map(getTokenSymbol).slice(0, 3).join(", ")}
                    {tokenList.length > 3
                      ? ` +${tokenList.length - 3} more`
                      : ""}
                  </div>
                </div>
                {pool.address === poolAddress ? (
                  <CheckmarkIcon className="h-4 w-4 fill-white" />
                ) : (
                  <div />
                )}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
