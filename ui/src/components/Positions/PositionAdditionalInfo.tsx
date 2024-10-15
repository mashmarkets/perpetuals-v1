import CloseIcon from "@carbon/icons-react/lib/Close";
import { BN } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { closePosition } from "src/actions/closePosition";
import { twMerge } from "tailwind-merge";

import { PositionValueDelta } from "@/components/Positions/PositionValueDelta";
import { SolidButton } from "@/components/SolidButton";
import { usePrice } from "@/hooks/price";
import { getPositionData } from "@/hooks/storeHelpers/fetchPositions";
import { getAllUserData } from "@/hooks/storeHelpers/fetchUserData";
import { PositionAccount } from "@/lib/PositionAccount";
import { getTokenPublicKey } from "@/lib/Token";
import { Side } from "@/lib/types";
import { useGlobalStore } from "@/stores/store";
import { formatPrice } from "@/utils/formatters";

interface Props {
  className?: string;
  position: PositionAccount;
  pnl: number;
  liqPrice: number;
}

export function PositionAdditionalInfo(props: Props) {
  const walletContextState = useWallet();
  const { publicKey } = useWallet();

  const { connection } = useConnection();
  const token = getTokenPublicKey(props.position.token);
  const { data: price } = usePrice(token);

  const poolData = useGlobalStore((state) => state.poolData);
  const custodyData = useGlobalStore((state) => state.custodyData);

  const setPositionData = useGlobalStore((state) => state.setPositionData);
  const setUserData = useGlobalStore((state) => state.setUserData);

  const positionPool = poolData[props.position.pool.toString()]!;
  const positionCustody = custodyData[props.position.custody.toString()]!;

  async function handleCloseTrade() {
    await closePosition(
      walletContextState,
      connection,
      positionPool,
      props.position,
      positionCustody,
      new BN(price!.currentPrice * 10 ** 6),
    );

    const positionInfos = await getPositionData(custodyData);
    setPositionData(positionInfos);
    const userData = await getAllUserData(connection, publicKey, poolData);
    setUserData(userData);
  }

  if (price === undefined) return <p>sdf</p>;

  return (
    <div
      className={twMerge(
        "overflow-hidden",
        "grid",
        "grid-cols-[12%,1fr,1fr,max-content]",
        "gap-x-8",
        "items-center",
        "pr-4",
        props.className,
      )}
    >
      <div />
      <div
        className={twMerge(
          "bg-zinc-900",
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
            {props.position.getTimestamp()}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">PnL</div>
          <PositionValueDelta
            className="mt-0.5"
            valueDelta={props.pnl}
            valueDeltaPercentage={
              (props.pnl * 100) / props.position.getCollateralUsd()
            }
          />
        </div>
        <div>
          <div className="text-xs text-zinc-500">Size</div>
          <div className="mt-1 flex items-center">
            <div className="text-sm text-white">
              ${formatPrice(props.position.getSizeUsd())}
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
            $
            {formatPrice(
              props.position.side === Side.Long
                ? price.currentPrice - props.liqPrice
                : props.liqPrice - price.currentPrice,
            )}
          </div>
        </div>
      </div>
      <SolidButton className="h-9 w-36" onClick={handleCloseTrade}>
        <CloseIcon className="mr-2 h-4 w-4" />
        <div>Close Position</div>
      </SolidButton>
    </div>
  );
}
