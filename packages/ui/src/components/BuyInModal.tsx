import * as Dialog from "@radix-ui/react-dialog";
import { Address } from "@solana/addresses";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { enterCompetition, findFaucetAddressSync } from "@/actions/faucet";
import { TokenSelector } from "@/components/TokenSelector";
import { SolidButton } from "@/components/ui/SolidButton";
import { useBalance } from "@/hooks/token";
import { useWriteFaucetProgram } from "@/hooks/useProgram";
import { EPOCH, getTokenSymbol, USDC_MINT } from "@/lib/Token";
import { SOL_RESERVE_AMOUNT } from "@/lib/types";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

export function BuyInModal({ children }: { children?: React.ReactNode }) {
  const min = 0.05;
  const rate = 10_000 / min;
  const [depositAmount, setDepositAmount] = useState(min);
  const [open, setOpen] = useState(false);

  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  const payToken = NATIVE_MINT.toString() as Address;

  const { data: balance } = useBalance(payToken, publicKey);

  const payTokenBalance = balance ? Number(balance) / 10 ** 9 : 0;
  const max = balance
    ? Math.floor((payTokenBalance - SOL_RESERVE_AMOUNT) / min) * min
    : 0;

  const program = useWriteFaucetProgram();
  const buyIn = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["balance", publicKey?.toString(), USDC_MINT],
      });
      queryClient.invalidateQueries({
        queryKey: ["balance", publicKey?.toString(), payToken],
      });

      const vault = findFaucetAddressSync(
        "vault",
        new PublicKey(payToken),
        Number(EPOCH),
      );

      queryClient.invalidateQueries({
        queryKey: ["balance", vault, payToken],
      });
    },
    mutationFn: async () => {
      if (!program || !publicKey) {
        return;
      }

      return await wrapTransactionWithNotification(
        program.provider.connection,
        enterCompetition(program, {
          amount: BigInt(Math.round(depositAmount * LAMPORTS_PER_SOL)),
          epoch: EPOCH,
        }),
      );
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={() => setOpen(!open)}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed bottom-0 left-0 right-0 top-0 grid place-items-center bg-black/80 text-white">
          <Dialog.Content className="max-w-s mt-6 rounded bg-zinc-800 p-4">
            <div>
              <div className="flex items-center justify-between">
                <>
                  <div className="text-sm font-medium text-white">You Pay</div>
                  {publicKey && (
                    <div>Balance: {payTokenBalance.toFixed(3)}</div>
                  )}
                </>
              </div>
              <TokenSelector
                className="mt-2"
                amount={depositAmount}
                token={payToken}
                min={min}
                step={min}
                onChangeAmount={(v) =>
                  setDepositAmount(Math.round(v * 100) / 100)
                }
                tokenList={[payToken!]}
                maxBalance={max}
              />
              <div className="mt-4 text-sm font-medium text-white">
                You Receive
              </div>
              <TokenSelector
                className="mt-2"
                amount={depositAmount * rate}
                token={USDC_MINT}
                tokenList={[USDC_MINT]}
              />
            </div>

            <p className="max-w-xs py-2 text-sm text-gray-100">
              Minimum buy-in is {min} SOL. <br />
              You can increase in increments of {min} SOL
            </p>

            <p className="max-w-xs py-2 text-sm text-red-400">
              Note: {getTokenSymbol(USDC_MINT)} has no real value, and can only
              be used for trading simulation on mash markets
            </p>
            <div className="flex-end flex pt-2">
              <Dialog.Close asChild>
                <SolidButton
                  className="w-full"
                  disabled={
                    !publicKey || depositAmount === 0 || buyIn.isPending
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    buyIn.mutate();
                  }}
                >
                  Enter
                </SolidButton>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
