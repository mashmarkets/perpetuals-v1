import { twMerge } from "tailwind-merge";

import { MaxButton } from "@/components/ui/MaxButton";

export const LpSelector = ({
  className,
  label,
  amount,
  onChangeAmount,
  maxBalance,
}: {
  className?: string;
  label?: string;
  amount?: number;
  onChangeAmount?(amount: number): void;
  maxBalance?: number;
}) => {
  return (
    <div>
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
          className,
        )}
      >
        <div className="flex items-center space-x-2">
          <p>{label ? label : "LP Tokens"}</p>

          <MaxButton maxBalance={maxBalance} onChangeAmount={onChangeAmount} />
        </div>
        <div>
          {amount === undefined ? (
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
                typeof onChangeAmount === "function"
                  ? "cursor-pointer"
                  : "cursor-none",
                typeof onChangeAmount === "function"
                  ? "pointer-events-auto"
                  : "pointer-events-none",
              )}
              placeholder="0"
              type="number"
              value={amount.toString()}
              onChange={(e) => {
                const value = e.currentTarget.valueAsNumber;
                onChangeAmount?.(isNaN(value) ? 0 : value);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
