import { twMerge } from "tailwind-merge";

import { usePrice } from "@/hooks/price";
import { getTokenPublicKey, TokenE } from "@/lib/Token";
import { formatNumberCommas } from "@/utils/formatters";

interface DailyStatsProps {
  className?: string;
  token: TokenE;
}

export function DailyStats(props: DailyStatsProps) {
  const { data: stats } = usePrice(getTokenPublicKey(props.token));

  if (stats === undefined) {
    return <p>sdf</p>;
  }

  return (
    <div
      className={twMerge("flex", "items-center", "space-x-5", props.className)}
    >
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
