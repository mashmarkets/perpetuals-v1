import ChevronRightIcon from "@carbon/icons-react/lib/ChevronRight";
import { Address } from "@solana/addresses";
import { cloneElement, useState } from "react";
import { twMerge } from "tailwind-merge";

import { TokenSelectorList } from "@/components/TokenSelectorList";
import { MaxButton } from "@/components/ui/MaxButton";
import { usePrice } from "@/hooks/price";
import { getTokenIcon, getTokenSymbol } from "@/lib/Token";

function formatNumber(num: number) {
  const formatter = Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return formatter.format(num);
}

interface Props {
  className?: string;
  amount?: number;
  token: Address;
  onChangeAmount?(amount: number): void;
  onSelectToken?(token: Address): void;
  tokenList?: Address[];
  maxBalance?: number;
  pendingRateConversion?: boolean;
}

export function TokenSelector(props: Props) {
  const { data: price } = usePrice(props.token);
  const [selectorOpen, setSelectorOpen] = useState(false);

  if (props.token === undefined) {
    return (
      <div
        className={twMerge(
          "grid-cols-[max-content,1fr]",
          "bg-zinc-900",
          "grid",
          "h-20",
          "items-center",
          "p-4",
          "rounded",
          "w-full",
          props.className,
        )}
      >
        <p>no Tokens</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={twMerge(
          "grid-cols-[max-content,1fr]",
          "bg-zinc-900",
          "grid",
          "h-20",
          "items-center",
          "p-4",
          "rounded",
          "w-full",
          props.className,
        )}
      >
        <div className="flex items-center">
          <button
            className="group flex items-center"
            onClick={() => setSelectorOpen(true)}
          >
            {cloneElement(getTokenIcon(props.token), {
              className: "h-6 rounded-full w-6",
            })}
            <div className="ml-1 mr-2 text-xl text-white">
              {getTokenSymbol(props.token)}
            </div>
            {(props.tokenList ?? []).length > 1 && (
              <ChevronRightIcon className="fill-gray-500 transition-colors group-hover:fill-white" />
            )}
          </button>
          <MaxButton
            maxBalance={props.maxBalance}
            onChangeAmount={props.onChangeAmount}
          />
        </div>
        <div>
          {props.pendingRateConversion || props.amount === undefined ? (
            <div className="text-right text-xs text-zinc-500">Loading...</div>
          ) : (
            <input
              className={twMerge(
                "bg-transparent",
                "h-full",
                "text-2xl",
                "text-right",
                "text-white",
                "top-0",
                "w-full",
                "focus:outline-none",
                typeof props.onChangeAmount === "function"
                  ? "cursor-pointer"
                  : "cursor-none",
                typeof props.onChangeAmount === "function"
                  ? "pointer-events-auto"
                  : "pointer-events-none",
              )}
              placeholder=""
              type="number"
              value={Math.round(props.amount * 100) / 100}
              onChange={(e) => {
                const value = e.currentTarget.valueAsNumber;
                props.onChangeAmount?.(isNaN(value) ? 0 : value);
              }}
            />
          )}
          {!!price?.currentPrice && props.amount !== undefined && (
            <div className="mt-0.5 text-right text-xs text-zinc-500">
              {formatNumber(props.amount * price.currentPrice)}
            </div>
          )}
        </div>
      </div>
      {selectorOpen && (props.tokenList ?? []).length > 1 && (
        <TokenSelectorList
          onClose={() => setSelectorOpen(false)}
          onSelectToken={props.onSelectToken}
          tokenList={props.tokenList}
        />
      )}
    </>
  );
}
