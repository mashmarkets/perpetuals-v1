import CloseIcon from "@carbon/icons-react/lib/Close";
import { Address } from "@solana/addresses";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { twMerge } from "tailwind-merge";

import { closePositionWithSwap } from "@/actions/perpetuals";
import { PositionValueDelta } from "@/components/Positions/PositionValueDelta";
import { SolidButton } from "@/components/ui/SolidButton";
import { useCompetitionMint, useCurrentEpoch } from "@/hooks/competition";
import { useCustody, useGetPosition, usePosition } from "@/hooks/perpetuals";
import { usePrice } from "@/hooks/pyth";
import {
  useWriteFaucetProgram,
  useWritePerpetualsProgram,
} from "@/hooks/useProgram";
import { PRICE_POWER, USD_POWER } from "@/lib/types";
import { formatPrice, formatUsd } from "@/utils/formatters";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";
import { dedupe } from "@/utils/utils";

export function PositionAdditionalInfo({
  className,
  positionAddress,
}: {
  className?: string;
  positionAddress: Address;
}) {
  const queryClient = useQueryClient();

  const epoch = useCurrentEpoch();
  const receiveMint = useCompetitionMint();
  const { data: position } = usePosition(positionAddress);
  const { data: custody } = useCustody(position?.custody);
  const { data: getPosition } = useGetPosition(position);

  const mint = custody?.mint;
  const { data: price } = usePrice(mint);

  const { publicKey } = useWallet();
  const perpetuals = useWritePerpetualsProgram();
  const faucet = useWriteFaucetProgram();

  const closePositionMutation = useMutation({
    onSuccess: (sig) => {
      // Receive Balance
      queryClient.invalidateQueries({
        queryKey: ["account", publicKey?.toString(), receiveMint],
      });
      // Collateral Balance
      queryClient.invalidateQueries({
        queryKey: ["account", publicKey?.toString(), mint],
      });
      // Pool
      queryClient.invalidateQueries({
        queryKey: ["pool", position?.pool],
      });
      // Remove position
      queryClient.setQueryData(
        ["positions", publicKey?.toString()],
        (p: Address[] | undefined) =>
          (p ?? []).filter((x) => x !== position?.address),
      );

      // Add signature to position address for order history
      queryClient.setQueryData(
        ["getSignaturesForAddress", position?.address],
        (sigs: string[] | undefined) => dedupe([...(sigs ?? []), sig]),
      );
    },
    mutationFn: async () => {
      if (
        perpetuals === undefined ||
        faucet === undefined ||
        position === undefined ||
        custody === undefined ||
        price === undefined
      ) {
        return;
      }

      return await wrapTransactionWithNotification(
        perpetuals.provider.connection,
        closePositionWithSwap(
          { perpetuals, faucet },
          {
            position,
            custody,
            price: BigInt(Math.round(price * PRICE_POWER * 0.95)), // Slippage
            receiveMint,
            epoch,
          },
        ),
        {
          pending: "Closing Position",
          success: "Position Closed",
          error: "Failed to close position",
        },
      );
    },
  });

  if (price === undefined) return <p></p>;

  return (
    <div
      className={twMerge(
        "w-full",
        "overflow-hidden",
        "grid",
        "grid-cols-[1fr,max-content]",
        "gap-x-8",
        "items-center",
        "px-4",
        className,
      )}
    >
      <div
        className={twMerge(
          // "bg-zinc-900",
          "gap-x-8",
          "grid-cols-[max-content,1fr,1fr,1fr]",
          "grid",
          "h-20",
          "items-center",
          "px-3",
          "rounded",
          "w-full",
        )}
      >
        <div>
          <div className="text-xs text-zinc-500">Time</div>
          <div className="mt-1 text-sm text-white">
            {position && position.openTime.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">PnL</div>
          {position && getPosition ? (
            <PositionValueDelta
              className="mt-0.5"
              valueDelta={
                Number(getPosition.profit - getPosition.loss) / USD_POWER
              }
              valueDeltaPercentage={
                (Number(getPosition.profit - getPosition.loss) /
                  Number(position.collateralUsd)) *
                100
              }
            />
          ) : (
            "-"
          )}
        </div>
        <div>
          <div className="text-xs text-zinc-500">Size</div>
          <div className="mt-1 flex items-center">
            <div className="text-sm text-white">
              {position ? formatUsd(Number(position.sizeUsd) / USD_POWER) : "-"}
            </div>
            {/* <CollateralModal position={props.position} pnl={props.pnl}>
              <button className="group ml-2">
                <EditIcon
                  className={twMerge(
                    "fill-zinc-500",
                    "h-4",
                    "transition-colors",
                    "w-4",
                    "group-hover:fill-white"
                  )}
                />
              </button>
            </CollateralModal> */}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Liq. Threshold</div>
          <div className="mt-1 text-sm text-white">
            {price && getPosition
              ? formatPrice(
                  price - Number(getPosition.liquidationPrice) / PRICE_POWER,
                )
              : "-"}
            {/* // props.position.side === Side.Long // ? price.currentPrice -
            props.liqPrice // : props.liqPrice - price.currentPrice, */}
          </div>
        </div>
      </div>
      <SolidButton
        className="h-9 w-36"
        onClick={() => closePositionMutation.mutateAsync()}
      >
        <CloseIcon className="mr-2 h-4 w-4" />
        <div>Close Position</div>
      </SolidButton>
    </div>
  );
}
