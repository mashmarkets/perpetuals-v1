import { Address } from "@solana/addresses";
import { cloneElement } from "react";
import { twMerge } from "tailwind-merge";

import { useGetTokenInfo } from "@/hooks/token";
import { Side } from "@/lib/types";
import { formatFees, formatPrice, formatUsd } from "@/utils/formatters";

interface Props {
  className?: string;
  collateralToken: Address;
  positionToken: Address;
  entryPrice: number;
  liquidationPrice: number;
  fees: number;
  availableLiquidity: number;
  borrowRate: number;
  side: Side;
  onSubmit?(): void;
}

export function TradeDetails(props: Props) {
  const { getTokenSymbol, getTokenIcon } = useGetTokenInfo();

  const icon = getTokenIcon(props.positionToken);
  const symbol = getTokenSymbol(props.positionToken);

  return (
    <div className={props.className}>
      <header className="mb-4 flex items-center">
        <div className="text-sm font-medium text-white">{props.side}</div>
        {cloneElement(icon, {
          className: twMerge(icon.props.className, "h-4", "ml-1.5", "w-4"),
        })}
        <div className="ml-0.5 text-sm font-semibold text-white">
          {getTokenSymbol(props.positionToken)}
        </div>
      </header>
      <div className={twMerge("grid", "grid-cols-2", "gap-4")}>
        {[
          {
            label: "Collateral in",
            value: getTokenSymbol(props.collateralToken),
          },
          {
            label: "Entry Price",
            value: `${formatPrice(props.entryPrice)}`,
          },
          {
            label: "Liq. Price",
            value: `${formatPrice(props.liquidationPrice)}`,
          },
          {
            label: "Entry Fees",
            value: `${props.fees} ${symbol}`,
          },
          {
            label: "Borrow Rate",
            value: (
              <>
                {`${formatFees(100 * props.borrowRate)}% / hr`}
                <span className="text-zinc-500"> </span>
              </>
            ),
          },
          {
            label: "Available Liquidity",
            value: `${formatUsd(props.availableLiquidity)}`,
          },
        ].map(({ label, value }, i) => (
          <div
            className={twMerge(
              "border-zinc-700",
              i < 4 && "pb-4",
              i < 4 && "border-b",
            )}
            key={i}
          >
            <div className="text-sm text-zinc-400">{label}</div>
            <div className="text-sm text-white">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
