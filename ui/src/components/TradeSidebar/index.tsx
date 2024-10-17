import GrowthIcon from "@carbon/icons-react/lib/Growth";
import { PublicKey } from "@solana/web3.js";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { twMerge } from "tailwind-merge";

import { SidebarTab } from "@/components/SidebarTab";
import { TradePosition } from "@/components/TradeSidebar/TradePosition";
import { Side } from "@/lib/types";

export function TradeSidebar({
  className,
  mint,
  poolAddress,
}: {
  className?: string;
  mint: PublicKey;
  poolAddress: PublicKey;
}) {
  const [side, setSide] = useState(Side.Long);

  return (
    <div className={className}>
      <div className="mb-3 font-medium text-white">Place a Market Order</div>
      <div
        className={twMerge("bg-zinc-800", "p-4", "rounded", "overflow-hidden")}
      >
        <div className="grid grid-cols-2 gap-x-1 rounded bg-black p-1">
          <SidebarTab
            selected={side === Side.Long}
            onClick={() => setSide(Side.Long)}
          >
            <GrowthIcon className="h-4 w-4" />
            <div>Long</div>
          </SidebarTab>
          <SidebarTab
            selected={side === Side.Short}
            onClick={() => {
              toast("Short trading is coming soon", {
                position: "top-right",
                autoClose: 1000,
              });
            }}
          >
            <GrowthIcon className="h-4 w-4 -scale-y-100" />
            <div>Short</div>
          </SidebarTab>
        </div>
        {side === Side.Long && (
          <TradePosition
            className="mt-6"
            side={Side.Long}
            mint={mint}
            poolAddress={poolAddress}
          />
        )}
        {/* {side === Side.Short && (
          <TradePosition className="mt-6" side={Side.Short} token={token} />
        )} */}
      </div>
    </div>
  );
}
