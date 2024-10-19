import { PublicKey } from "@solana/web3.js";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import { PositionAdditionalInfo } from "@/components/Positions/PositionAdditionalInfo";
import PositionBasicInfo from "@/components/Positions/PositionBasicInfo";

export default function PoolPositionRow({
  className,
  positionAddress,
}: {
  positionAddress: PublicKey;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={twMerge(expanded && "bg-zinc-800", className)}>
      <PositionBasicInfo
        className="transition-colors"
        expanded={expanded}
        positionAddress={positionAddress}
        onClickExpand={() => setExpanded((cur) => !cur)}
      />
      <PositionAdditionalInfo
        className={twMerge(
          "transition-all",
          expanded ? "opacity-100" : "opacity-0",
          expanded ? "py-5" : "py-0",
          expanded ? "h-auto" : "h-0",
        )}
        positionAddress={positionAddress}
      />
    </div>
  );
}
