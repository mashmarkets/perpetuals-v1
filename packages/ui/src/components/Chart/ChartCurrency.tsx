import { get } from "http";
import ChevronDownIcon from "@carbon/icons-react/lib/ChevronDown";
import { Address } from "@solana/addresses";
import { useRouter } from "next/router";
import { cloneElement, useState } from "react";
import { twMerge } from "tailwind-merge";

import { findPerpetualsAddressSync } from "@/actions/perpetuals";
import { getTokenIcon, getTokenLabel, getTokenSymbol } from "@/lib/Token";
import { getTradeRouteFromSymbol } from "@/utils/routes";

import { TokenSelectorList } from "../TokenSelectorList";

export function ChartCurrency({
  mint,
  className,
}: {
  className?: string;
  mint: Address;
}) {
  const tokenIcon = getTokenIcon(mint);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        className={twMerge(
          "flex",
          "group",
          "items-center",
          "space-x-2",
          className,
        )}
        onClick={() => setSelectorOpen((cur) => !cur)}
      >
        {cloneElement(tokenIcon, {
          className: twMerge(tokenIcon.props.className, "h-8", "w-8"),
        })}
        <div className="flex items-baseline space-x-2">
          <div className="text-3xl font-bold text-white">
            {getTokenSymbol(mint)}
          </div>
          <div className="text-sm font-medium text-zinc-500">
            {getTokenLabel(mint)}
          </div>
        </div>
        <div className="pl-4">
          <div
            className={twMerge(
              "border-zinc-700",
              "border",
              "grid",
              "h-6",
              "place-items-center",
              "rounded-full",
              "transition-colors",
              "w-6",
              "group-hover:border-white",
            )}
          >
            <ChevronDownIcon className="h-4 w-4 fill-white" />
          </div>
        </div>
      </button>
      {selectorOpen && (
        <TokenSelectorList
          onClose={() => setSelectorOpen(false)}
          onSelectToken={(token) => {
            router.push(getTradeRouteFromSymbol(getTokenSymbol(token)));
          }}
        />
      )}
    </>
  );
}
