import ChevronDownIcon from "@carbon/icons-react/lib/ChevronDown";
import EditIcon from "@carbon/icons-react/lib/Edit";
import GrowthIcon from "@carbon/icons-react/lib/Growth";
import NewTab from "@carbon/icons-react/lib/NewTab";
import { Address } from "@solana/addresses";
import { cloneElement } from "react";
import { twMerge } from "tailwind-merge";

import { CollateralModal } from "@/components/CollateralModal";
import { PositionColumn } from "@/components/Positions/PositionColumn";
import {
  Custody,
  Position,
  useCustody,
  usePosition,
  usePositionLiquidationPrice,
  usePositionPnl,
} from "@/hooks/perpetuals";
import { usePrice } from "@/hooks/price";
import { getTokenIcon, getTokenLabel, getTokenSymbol } from "@/lib/Token";
import { formatNumberCommas, formatPrice } from "@/utils/formatters";
import { ACCOUNT_URL } from "@/utils/TransactionHandlers";

const getPositionLeverage = (
  position: Position | undefined,
  custody: Custody | undefined,
) => {
  if (!position || !custody) {
    return undefined;
  }

  const size = Number(position.sizeUsd);
  const collateral = Number(position.collateralUsd);
  const slippage = Number(custody.pricing.tradeSpreadShort) / 10 ** 4;
  const fees = Number(custody.fees.closePosition) / 10 ** 4;
  // TODO:- This is wrong - slippage acts on mark price
  const margin = collateral - slippage * size - fees * collateral;

  return size / margin;
};

export default function PositionBasicInfo({
  className,
  expanded,
  positionAddress,
  onClickExpand,
}: {
  className?: string;
  expanded?: boolean;
  positionAddress: Address;
  onClickExpand?(): void;
}) {
  const { data: position } = usePosition(positionAddress);
  const { data: custody } = useCustody(position?.custody);
  const { data: liquidationPrice } = usePositionLiquidationPrice(position);
  const { data: pnl } = usePositionPnl(position);

  const mint = custody?.mint;
  const { data: price } = usePrice(mint);
  const tokenIcon = getTokenIcon(mint);

  const leverage = getPositionLeverage(position, custody);

  const netValue =
    position && pnl
      ? position.collateralUsd + pnl.profit - pnl.loss
      : undefined;

  return (
    <div className={twMerge("flex", "items-center", "py-5", className)}>
      <PositionColumn num={1}>
        <div
          className={twMerge(
            "gap-x-2",
            "grid-cols-[32px,minmax(0,1fr)]",
            "grid",
            "items-center",
            "overflow-hidden",
            "pl-3",
          )}
        >
          {cloneElement(tokenIcon, {
            className: twMerge(
              tokenIcon.props.className,
              "flex-shrink-0",
              "h-8",
              "w-8",
            ),
          })}
          <div className="pr-2">
            <div className="font-bold text-white">{getTokenSymbol(mint)}</div>
            <div className="mt-0.5 truncate text-sm font-medium text-zinc-500">
              {getTokenLabel(mint)}
            </div>
          </div>
        </div>
      </PositionColumn>
      <PositionColumn num={2}>
        <div className="text-sm text-white">
          {leverage ? leverage.toFixed(3) : "-"}x
        </div>
        <div
          className={twMerge(
            "flex",
            "items-center",
            "mt-1",
            "space-x-1",
            "text-emerald-400",
          )}
        >
          <GrowthIcon className="h-3 w-3 fill-current" />
          {/* {props.position.side === Side.Long ? (
          ) : (
            <GrowthIcon className="h-3 w-3 -scale-y-100 fill-current" />
          )} */}
          <div className="text-sm">Long</div>
        </div>
      </PositionColumn>
      <PositionColumn num={3}>
        <div className="text-sm text-white">
          {netValue
            ? "$" + formatNumberCommas(Number(netValue) / 10 ** 6)
            : "-"}
        </div>
      </PositionColumn>
      <PositionColumn num={4}>
        <div className="text-sm text-white">
          {position
            ? "$" + formatPrice(Number(position.sizeUsd) / 10 ** 6)
            : "-"}
        </div>
      </PositionColumn>
      <PositionColumn num={5}>
        <div className="flex items-center">
          <div className="text-sm text-white">
            $
            {position
              ? formatNumberCommas(Number(position.collateralUsd) / 10 ** 6)
              : "-"}
          </div>
          <CollateralModal positionAddress={positionAddress}>
            <button className="group ml-2">
              <EditIcon
                className={twMerge(
                  "fill-zinc-500",
                  "h-4",
                  "transition-colors",
                  "w-4",
                  "group-hover:fill-white",
                )}
              />
            </button>
          </CollateralModal>
        </div>
      </PositionColumn>
      <PositionColumn num={6}>
        <div className="text-sm text-white">
          $
          {position
            ? formatNumberCommas(Number(position.price) / 10 ** 6)
            : "-"}
          {" / "}
          <span className="text-slate-400">
            ${price ? formatNumberCommas(price.currentPrice) : "-"}
          </span>
        </div>
      </PositionColumn>
      <PositionColumn num={7}>
        <div className="flex items-center justify-between pr-2">
          <div className="text-sm text-white">
            $
            {liquidationPrice
              ? formatNumberCommas(Number(liquidationPrice) / 10 ** 6)
              : "-"}
          </div>
          {position && (
            <div className="ml-2 flex items-center space-x-2">
              <a
                target="_blank"
                rel="noreferrer"
                href={`${ACCOUNT_URL(position.address.toString())}`}
              >
                <NewTab className="fill-white" />
              </a>
              <button
                className={twMerge(
                  "bg-zinc-900",
                  "grid",
                  "h-6",
                  "place-items-center",
                  "rounded-full",
                  "transition-all",
                  "w-6",
                  "hover:bg-zinc-700",
                  expanded && "-rotate-180",
                )}
                onClick={() => onClickExpand?.()}
              >
                <ChevronDownIcon className="h-4 w-4 fill-white" />
              </button>
            </div>
          )}
        </div>
      </PositionColumn>
    </div>
  );
}
