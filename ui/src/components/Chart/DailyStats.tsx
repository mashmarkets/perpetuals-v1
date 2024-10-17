import { PublicKey } from "@solana/web3.js";
import { twMerge } from "tailwind-merge";

import { usePrice } from "@/hooks/price";
import { formatNumberCommas } from "@/utils/formatters";

export function DailyStats({
  className,
  mint,
}: {
  className?: string;
  mint: PublicKey;
}) {
  const { data: stats } = usePrice(mint);

  if (stats === undefined) {
    return <p>sdf</p>;
  }

  return (
    <div className={twMerge("flex", "items-center", "space-x-5", className)}>
      <div>
        <div className="text-xs text-zinc-500">Current Price</div>
        <div className="text-sm text-white">
          ${formatNumberCommas(stats.currentPrice)}
        </div>
      </div>
      <div>
        <div className="text-xs text-zinc-500">24h Change</div>
        <div
          className={twMerge(
            "text-sm",
            stats.change24hr < 0 && "text-rose-400",
            stats.change24hr === 0 && "text-white",
            stats.change24hr > 0 && "text-emerald-400",
          )}
        >
          ${formatNumberCommas(stats.change24hr)}
        </div>
      </div>
    </div>
  );
}
