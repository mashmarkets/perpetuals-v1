import Add from "@carbon/icons-react/lib/Add";
import ArrowRight from "@carbon/icons-react/lib/ArrowRight";
import Subtract from "@carbon/icons-react/lib/Subtract";
import * as Dialog from "@radix-ui/react-dialog";
import { Address } from "@solana/addresses";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import { addCollateral, removeCollateral } from "@/actions/perpetuals";
import { LpSelector } from "@/components/PoolModal/LpSelector";
import { TokenSelector } from "@/components/TokenSelector";
import { SidebarTab } from "@/components/ui/SidebarTab";
import { SolidButton } from "@/components/ui/SolidButton";
import {
  useCustody,
  useGetLiquidationPrice,
  usePosition,
} from "@/hooks/perpetuals";
import { usePrice } from "@/hooks/price";
import { useBalance } from "@/hooks/token";
import {
  useWriteFaucetProgram,
  useWritePerpetualsProgram,
} from "@/hooks/useProgram";
import { getCurrentEpoch, USDC_MINT } from "@/lib/Token";
import { PRICE_POWER, USD_POWER } from "@/lib/types";
import { formatNumberCommas, formatPrice } from "@/utils/formatters";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

import { Tab } from "./ui/SidebarTab";

export function CollateralModal({
  children,
  positionAddress,
}: {
  children?: React.ReactNode;
  positionAddress: Address;
}) {
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(Tab.Add);

  const { publicKey } = useWallet();
  const perpetuals = useWritePerpetualsProgram();
  const faucet = useWriteFaucetProgram();
  const queryClient = useQueryClient();

  const { data: position } = usePosition(positionAddress);
  const { data: custody } = useCustody(position?.custody);
  const { data: collateralBalance } = useBalance(custody?.mint, publicKey);
  const { data: price } = usePrice(custody?.mint);

  const { data: currentLiquidationPrice } = useGetLiquidationPrice({
    position,
  });

  const CUSTODY_POWER = custody ? 10 ** custody.decimals : 0;

  const amounts = useDebounce({ depositAmount, withdrawAmount }, 400);
  const { data: newLiquidationPrice } = useGetLiquidationPrice({
    position,
    addCollateral: BigInt(Math.round(amounts.depositAmount * CUSTODY_POWER)),
    // This is awkward, because the actual function takes USD, but the estimate takes in collateral amount
    removeCollateral: price
      ? BigInt(
          Math.round(
            (amounts.withdrawAmount * CUSTODY_POWER) / price.currentPrice,
          ),
        )
      : BigInt(0),
  });

  // const payToken = custody ? custody.mint : undefined;
  const payToken = USDC_MINT;

  const payTokenBalance = Number(collateralBalance) / CUSTODY_POWER;
  const collateralAmount = price
    ? (depositAmount * 0.995) / price.currentPrice
    : 0;

  const changeCollateralUsd =
    tab === Tab.Add
      ? BigInt(
          Math.round(
            (price?.currentPrice ?? 0) * collateralAmount * CUSTODY_POWER,
          ),
        )
      : BigInt(Math.round(-1 * withdrawAmount) * USD_POWER);

  const newCollateralUsd = position
    ? position.collateralUsd + changeCollateralUsd
    : BigInt(0);

  const changeCollateral = useMutation({
    onSuccess: () => {
      if (tab === Tab.Add) {
        setDepositAmount(0);
      } else {
        setWithdrawAmount(0);
      }

      // Collateral Balance
      queryClient.invalidateQueries({
        queryKey: ["account", publicKey?.toString(), custody?.mint.toString()],
      });
      // Position
      queryClient.invalidateQueries({
        queryKey: ["position", positionAddress.toString()],
      });
      // Pool
      queryClient.invalidateQueries({
        queryKey: ["pool", position?.pool?.toString()],
      });
    },
    mutationFn: async () => {
      if (
        perpetuals === undefined ||
        faucet === undefined ||
        position === undefined ||
        custody === undefined
      ) {
        return;
      }
      const promise =
        tab === Tab.Add
          ? addCollateral(
              { perpetuals, faucet },
              {
                position,
                custody,
                collateral: BigInt(
                  Math.round(collateralAmount * CUSTODY_POWER),
                ),
                payMint: payToken,
                epoch: getCurrentEpoch(),
              },
            )
          : removeCollateral(
              { perpetuals, faucet },
              {
                position,
                custody,
                collateralUsd: BigInt(Math.round(withdrawAmount * USD_POWER)),
                receiveMint: USDC_MINT,
                epoch: getCurrentEpoch(),
              },
            );
      //receive

      return wrapTransactionWithNotification(
        perpetuals.provider.connection,
        promise,
        {
          pending:
            tab === Tab.Add ? "Adding Collateral" : "Removing Collateral",
          success: tab === Tab.Add ? "Collateral Added" : "Collateral Removed",
          error:
            tab === Tab.Add
              ? "Failed to add collateral"
              : "Failed to remove collateral",
        },
      );
    },
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={() => {
        setOpen(!open);
        setWithdrawAmount(0);
        setDepositAmount(0);
      }}
    >
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed bottom-0 left-0 right-0 top-0 grid place-items-center bg-black/80 text-white">
          <Dialog.Content className="max-w-s mt-6 rounded bg-zinc-800 p-4">
            <div className="mb-2 grid grid-cols-2 gap-x-1 rounded bg-black p-1">
              <SidebarTab
                selected={tab === Tab.Add}
                onClick={() => {
                  setWithdrawAmount(0);
                  setDepositAmount(0);
                  setTab(Tab.Add);
                }}
              >
                <Add className="h-4 w-4" />
                <div>Deposit</div>
              </SidebarTab>
              <SidebarTab
                selected={tab === Tab.Remove}
                onClick={() => {
                  setWithdrawAmount(0);
                  setDepositAmount(0);
                  setTab(Tab.Remove);
                }}
              >
                <Subtract className="h-4 w-4" />
                <div>Withdraw</div>
              </SidebarTab>
            </div>
            <div>
              <div className="flex items-center justify-between">
                {tab === Tab.Add ? (
                  <>
                    <div className="text-sm font-medium text-white">
                      You Add
                    </div>
                    {publicKey && (
                      <div>
                        Max:{" "}
                        {collateralBalance &&
                          custody &&
                          (Number(collateralBalance) / CUSTODY_POWER).toFixed(
                            3,
                          )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-sm font-medium text-white">
                      You Remove
                    </div>
                    {publicKey && position && (
                      <div>
                        Max:{" "}
                        {(Number(position.collateralUsd) / USD_POWER).toFixed(
                          3,
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              {tab === Tab.Add ? (
                <TokenSelector
                  className="mt-2"
                  amount={depositAmount}
                  token={payToken!}
                  onChangeAmount={setDepositAmount}
                  tokenList={[payToken!]}
                  maxBalance={payTokenBalance}
                />
              ) : (
                <LpSelector
                  className="mt-2"
                  amount={withdrawAmount}
                  onChangeAmount={setWithdrawAmount}
                  maxBalance={Number(position?.collateralUsd ?? 0) / USD_POWER}
                  label={"USD"}
                />
              )}
            </div>

            <div className={twMerge("grid", "grid-cols-2", "gap-4", "pt-2")}>
              {[
                {
                  label: "Collateral",
                  value: `$${formatNumberCommas(
                    Number(position?.collateralUsd ?? 0) / USD_POWER,
                  )}`,
                  newValue: `$${formatNumberCommas(Number(newCollateralUsd) / USD_POWER)}`,
                },
                {
                  label: "Mark Price",
                  value: `$${
                    price ? formatNumberCommas(price.currentPrice) : "-"
                  }`,
                },
                {
                  label: "Leverage",
                  // TODO:- Should calculate leverage including exit fees
                  value:
                    position &&
                    `${(Number(position.sizeUsd) / Number(position.collateralUsd)).toFixed(2)}`,
                  newValue:
                    position &&
                    `${(Number(position.sizeUsd) / Number(newCollateralUsd)).toFixed(2)}`,
                },
                {
                  label: "Size",
                  value: `$${formatNumberCommas(Number(position?.sizeUsd ?? 0) / USD_POWER)}`,
                },
                {
                  label: "Liq Price",
                  value: `$${formatPrice(Number(currentLiquidationPrice) / PRICE_POWER)}`,
                  newValue: newLiquidationPrice
                    ? `$${formatPrice(Number(newLiquidationPrice) / PRICE_POWER)}`
                    : undefined,
                },
              ].map(({ label, value, newValue }, i) => (
                <div
                  className={twMerge(
                    "border-zinc-700",
                    "pb-2",
                    i < 6 && "border-b",
                    i > 3 && "col-span-2",
                  )}
                  key={i}
                >
                  <div className="text-xs text-zinc-400">{label}</div>
                  <div className="space flex flex-row items-center space-x-1">
                    <div className="text-sm text-white">{value}</div>

                    {newValue && newValue !== value && (
                      <>
                        <p className="text-sm text-white">
                          <ArrowRight />
                        </p>

                        <div className="text-sm font-semibold text-white">
                          {newValue}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-end flex pt-2">
              <Dialog.Close asChild>
                <SolidButton
                  className="w-full"
                  disabled={
                    !publicKey || (depositAmount === 0 && withdrawAmount === 0)
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    changeCollateral.mutate();
                  }}
                >
                  {tab === Tab.Add ? "Add Collateral" : "Remove Collateral"}
                </SolidButton>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
