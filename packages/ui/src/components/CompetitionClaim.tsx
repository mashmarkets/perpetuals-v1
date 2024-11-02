import { Account, NATIVE_MINT } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { competitionClaim } from "@/actions/faucet";
import { SolidButton } from "@/components/ui/SolidButton";
import { useAccount } from "@/hooks/token";
import { useWriteFaucetProgram } from "@/hooks/useProgram";
import { EPOCH, USDC_MINT } from "@/lib/Token";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

export function CompetitionClaim() {
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const { data: account } = useAccount(USDC_MINT, publicKey);

  const program = useWriteFaucetProgram();
  const claim = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["balance", publicKey?.toString(), NATIVE_MINT.toString()],
      });
    },
    mutationFn: async () => {
      if (!program || !publicKey) {
        return;
      }

      return await wrapTransactionWithNotification(
        program.provider.connection,
        competitionClaim(program, {
          epoch: EPOCH,
        }),
      );
    },
  });

  if ((account as Account)?.isFrozen) {
    return null;
  }

  return (
    <SolidButton
      className="w-full"
      disabled={!publicKey || claim.isPending}
      onClick={(e) => {
        e.preventDefault();
        claim.mutate();
      }}
    >
      Claim
    </SolidButton>
  );
}
