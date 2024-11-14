import * as Dialog from "@radix-ui/react-dialog";
import { Address } from "@solana/addresses";
import { NATIVE_MINT } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { competitionEnter, findFaucetAddressSync } from "@/actions/faucet";
import { TokenSelector } from "@/components/TokenSelector";
import { SolidButton } from "@/components/ui/SolidButton";
import { useCompetitionMint, useCurrentEpoch } from "@/hooks/competition";
import { useBalance, useGetTokenInfo } from "@/hooks/token";
import { useWriteFaucetProgram } from "@/hooks/useProgram";
import { SOL_RESERVE_AMOUNT } from "@/lib/types";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

export function BuyInModal({ children }: { children?: React.ReactNode }) {
  const min = 0.05;
  const rate = 10_000 / min;
  const [depositAmount, setDepositAmount] = useState(min);
  const epoch = useCurrentEpoch();
  const { getTokenSymbol } = useGetTokenInfo();
  const competitionMint = useCompetitionMint();
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
  // NOTE:- If epoch changes during mutation, the invalidate queries will be for the wrong tokens
  const buyIn = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["account", publicKey?.toString(), competitionMint],
      });
      queryClient.invalidateQueries({
        queryKey: ["account", publicKey?.toString(), payToken],
      });

      const vault = findFaucetAddressSync(
        "vault",
        new PublicKey(payToken),
        epoch,
      );

      queryClient.invalidateQueries({
        queryKey: ["account", vault, payToken],
      });
    },
    mutationFn: async () => {
      if (!program || !publicKey) {
        return;
      }

      return await wrapTransactionWithNotification(
        program.provider.connection,
        competitionEnter(program, {
          amount: BigInt(Math.round(depositAmount * LAMPORTS_PER_SOL)),
          epoch,
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
                token={competitionMint}
                tokenList={[competitionMint]}
              />
            </div>

            <p className="max-w-xs py-2 text-sm text-gray-100">
              Minimum buy-in is {min} SOL. <br />
              You can increase in increments of {min} SOL
            </p>

            <p className="max-w-xs py-2 text-sm text-red-400">
              Note: {getTokenSymbol(competitionMint)} has no real value, and can
              only be used for trading simulation on mash markets
            </p>
            <div className="flex-end flex pt-2">
              <Dialog.Close asChild>
                <SolidButton
                  className="w-full"
                  disabled={
                    !publicKey || depositAmount === 0 || buyIn.isPending
                  }
                  // When rejecting the transaction, i get unhandled error error so added a catch.
                  // Couldn't figure out why it doesn't happen elsewhere
                  onClick={() => buyIn.mutateAsync().catch(() => {})}
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
