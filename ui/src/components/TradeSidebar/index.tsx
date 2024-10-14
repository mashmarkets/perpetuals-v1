import GrowthIcon from "@carbon/icons-react/lib/Growth";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import { SidebarTab } from "@/components/SidebarTab";
import { TradePosition } from "@/components/TradeSidebar/TradePosition";
import { Side } from "@/lib/types";

interface Props {
  className?: string;
}

export function TradeSidebar(props: Props) {
  const [side, setSide] = useState(Side.Long);

  return (
    <div className={props.className}>
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
            onClick={() => setSide(Side.Short)}
          >
            <GrowthIcon className="h-4 w-4 -scale-y-100" />
            <div>Short</div>
          </SidebarTab>
        </div>
        {side === Side.Long && (
          <TradePosition className="mt-6" side={Side.Long} />
        )}
        {side === Side.Short && (
          <TradePosition className="mt-6" side={Side.Short} />
        )}
      </div>
    </div>
  );
}
