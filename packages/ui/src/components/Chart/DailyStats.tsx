import { Address } from "@solana/addresses";
import { twMerge } from "tailwind-merge";

import { usePriceStat } from "@/hooks/coingecko";
import { usePrice } from "@/hooks/pyth";
import { formatPrice } from "@/utils/formatters";

export function DailyStats({
  className,
  mint,
}: {
  className?: string;
  mint: Address;
}) {
  const { data: stats } = usePriceStat(mint);
  const { data: price } = usePrice(mint);

  if (price === undefined) {
    return <p></p>;
  }

  return (
    <div className={twMerge("flex", "items-center", "space-x-5", className)}>
      <div>
        <div className="text-xs text-zinc-500">Current Price</div>
        <div className="text-sm text-white">${formatPrice(price)}</div>
      </div>
      {stats && (
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
            {(stats.change24hr / 100).toLocaleString(undefined, {
              style: "percent",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
              signDisplay: "always",
            })}
          </div>
        </div>
      )}
    </div>
  );
}
