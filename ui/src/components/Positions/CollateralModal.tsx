import Add from "@carbon/icons-react/lib/Add";
import ArrowRight from "@carbon/icons-react/lib/ArrowRight";
import Subtract from "@carbon/icons-react/lib/Subtract";
import * as Dialog from "@radix-ui/react-dialog";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import { addCollateral, removeCollateral } from "@/actions/perpetuals";
import { LpSelector } from "@/components/PoolModal/LpSelector";
import { SidebarTab } from "@/components/SidebarTab";
import { SolidButton } from "@/components/SolidButton";
import { TokenSelector } from "@/components/TokenSelector";
import {
  useCustody,
  usePosition,
  usePositionLiquidationPrice,
} from "@/hooks/perpetuals";
import { usePrice } from "@/hooks/price";
import { useBalance } from "@/hooks/token";
import { useProgram } from "@/hooks/useProgram";
import { asToken, getTokenInfo } from "@/lib/Token";
import { Tab } from "@/lib/types";
import { formatNumberCommas, formatPrice } from "@/utils/formatters";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

export function CollateralModal({
  children,
  positionAddress,
}: {
  children?: React.ReactNode;
  positionAddress: PublicKey;
}) {
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(Tab.Add);

  const { publicKey } = useWallet();
  const program = useProgram();
  const queryClient = useQueryClient();

  const { data: position } = usePosition(positionAddress);
  const { data: custody } = useCustody(position?.custody);
  const { data: collateralBalance } = useBalance(custody?.mint, publicKey);
  const { data: price } = usePrice(custody?.mint);

  const { data: currentLiquidationPrice } =
    usePositionLiquidationPrice(position);

  const { decimals } = custody ? getTokenInfo(custody.mint) : { decimals: 0 };
  const amounts = useDebounce({ depositAmount, withdrawAmount }, 400);
  const { data: newLiquidationPrice } = usePositionLiquidationPrice(
    position,
    BigInt(Math.round(amounts.depositAmount * 10 ** decimals)),
    BigInt(Math.round(amounts.withdrawAmount * 10 ** 6)),
  );

  let payToken = custody ? asToken(custody.mint) : undefined;

  const payTokenBalance = Number(collateralBalance) / 10 ** decimals;
  const changeCollateralUsd =
    tab === Tab.Add
      ? BigInt(Math.round((price?.currentPrice ?? 0) * depositAmount * 10 ** 6))
      : BigInt(Math.round(-1 * withdrawAmount) * 10 ** 6);

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
        queryKey: ["balance", publicKey?.toString(), custody?.mint.toString()],
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
        program === undefined ||
        position === undefined ||
        custody === undefined
      ) {
        return;
      }
      const promise =
        tab === Tab.Add
          ? addCollateral(program, {
              position,
              custody,
              collateral: BigInt(Math.round(depositAmount * 10 ** decimals)),
            })
          : removeCollateral(program, {
              position,
              custody,
              collateralUsd: BigInt(Math.round(withdrawAmount * 10 ** 6)),
            });

      return wrapTransactionWithNotification(
        program.provider.connection,
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
                          (
                            Number(collateralBalance) /
                            10 ** custody.decimals
                          ).toFixed(3)}
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
                        {(Number(position.collateralUsd) / 10 ** 6).toFixed(3)}
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
                  maxBalance={Number(position?.collateralUsd ?? 0) / 10 ** 6}
                  label={"USD"}
                />
              )}
            </div>

            <div className={twMerge("grid", "grid-cols-2", "gap-4", "pt-2")}>
              {[
                {
                  label: "Collateral",
                  value: `$${formatNumberCommas(
                    Number(position?.collateralUsd ?? 0) / 10 ** 6,
                  )}`,
                  newValue: `$${formatNumberCommas(Number(newCollateralUsd) / 10 ** 6)}`,
                },
                {
                  label: "Mark Price",
                  value: `$${
                    price ? formatNumberCommas(price.currentPrice) : "-"
                  }`,
                },
                {
                  label: "Leverage",
                  value:
                    position &&
                    `${(Number(position.sizeUsd) / Number(position.collateralUsd)).toFixed(2)}`,
                  newValue:
                    position &&
                    `${(Number(position.sizeUsd) / Number(newCollateralUsd)).toFixed(2)}`,
                },
                {
                  label: "Size",
                  value: `$${formatNumberCommas(Number(position?.sizeUsd ?? 0) / 10 ** 6)}`,
                },
                {
                  label: "Liq Price",
                  value: `$${formatPrice(Number(currentLiquidationPrice) / 10 ** 6)}`,
                  newValue: `$${formatPrice(Number(newLiquidationPrice) / 10 ** 6)}`,
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
