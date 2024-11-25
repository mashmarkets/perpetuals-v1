import { Account } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { competitionClaim } from "@/actions/faucet";
import { SolidButton } from "@/components/ui/SolidButton";
import { useAccount } from "@/hooks/token";
import { useWriteFaucetProgram } from "@/hooks/useProgram";
import { getCompetitionMint, SOL_MINT } from "@/lib/Token";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

// Note: epoch might be historical, so don't use "current" global state
export function CompetitionClaim({ epoch }: { epoch: Date }) {
  const mint = getCompetitionMint(epoch);
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const { data: account } = useAccount(mint, publicKey);

  const program = useWriteFaucetProgram();
  const claim = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["account", publicKey?.toString(), SOL_MINT.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["account", publicKey?.toString(), mint],
      });
    },
    mutationFn: async () => {
      if (!program || !publicKey) {
        return;
      }

      return await wrapTransactionWithNotification(
        program.provider.connection,
        competitionClaim(program, {
          epoch,
        }),
      );
    },
  });

  if (
    epoch.getTime() > Date.now() || // Still not expired
    account === undefined ||
    account === null ||
    (account as Account)?.amount === BigInt(0) ||
    (account as Account)?.isFrozen
  ) {
    return null;
  }

  return (
    <SolidButton
      className="w-full"
      disabled={!publicKey || claim.isPending}
      onClick={(e) => {
        e.preventDefault();
        return claim.mutateAsync();
      }}
    >
      Claim
    </SolidButton>
  );
}
