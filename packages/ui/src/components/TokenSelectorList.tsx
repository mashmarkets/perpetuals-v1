import CloseIcon from "@carbon/icons-react/lib/Close";
import { Address } from "@solana/addresses";
import { cloneElement } from "react";
import { twMerge } from "tailwind-merge";

import { usePrices } from "@/hooks/price";
import {
  getTokenIcon,
  getTokenLabel,
  getTokenSymbol,
  TRADEABLE_MINTS,
} from "@/lib/Token";
import { formatPrice } from "@/utils/formatters";

interface Props {
  className?: string;
  onClose?(): void;
  onSelectToken?(token: Address): void;
  tokenList?: Address[];
}

export function TokenSelectorList(props: Props) {
  const list = props.tokenList ? props.tokenList : TRADEABLE_MINTS;

  const prices = usePrices(list);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 top-0 z-20 overflow-y-scroll bg-black/40"
      onClick={props.onClose}
    >
      <div
        className="bottom-0 left-0 top-0 w-[424px] bg-zinc-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <div className="text-sm font-medium text-white">You Pay</div>
          <button onClick={props.onClose}>
            <CloseIcon className="h-6 w-6 fill-white" />
          </button>
        </header>
        <div className="mt-6">
          {list.map((token) => {
            const icon = getTokenIcon(token);

            const stats = prices[token.toString()];
            return (
              <button
                key={token.toString()}
                className={twMerge(
                  "bg-zinc-900",
                  "gap-x-3",
                  "grid-cols-[40px,1fr,max-content]",
                  "grid",
                  "items-center",
                  "p-2.5",
                  "rounded",
                  "w-full",
                  "hover:bg-zinc-800",
                )}
                onClick={() => {
                  props.onSelectToken?.(token);
                  props.onClose?.();
                }}
              >
                {cloneElement(icon, {
                  className: "h-10 w-10",
                })}
                <div className="text-left">
                  <div className="font-semibold text-white">
                    {getTokenSymbol(token)}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {getTokenLabel(token)}
                  </div>
                </div>
                {stats && (
                  <>
                    <div className="text-right text-sm text-white">
                      ${formatPrice(stats.currentPrice)}
                      <br />
                      <span
                        className={twMerge(
                          "text-xs",
                          stats.change24hr < 0 && "text-rose-400",
                          stats.change24hr === 0 && "text-white",
                          stats.change24hr > 0 && "text-emerald-400",
                          "text-opacity-90",
                        )}
                      >
                        {(stats.change24hr / 100).toLocaleString(undefined, {
                          style: "percent",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                          signDisplay: "always",
                        })}
                      </span>
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}