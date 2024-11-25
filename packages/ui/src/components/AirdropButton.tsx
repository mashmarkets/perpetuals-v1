import { Address } from "@solana/addresses";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useGetTokenInfo } from "@/hooks/token";
import { useAnchorProvider } from "@/hooks/useProgram";
import { SOL_MINT } from "@/lib/Token";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

import { SolidButton } from "./ui/SolidButton";

export default function AirdropButton({ mint }: { mint: Address }) {
  const queryClient = useQueryClient();
  const provider = useAnchorProvider();
  const { getTokenSymbol } = useGetTokenInfo();

  const symbol = getTokenSymbol(mint);

  const airdropMutation = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "account",
          provider?.publicKey?.toString(),
          mint?.toString(),
        ],
      });
    },
    mutationFn: async () => {
      if (provider === undefined || provider.publicKey === undefined) {
        return;
      }
      const promise = provider.connection.requestAirdrop(
        provider.publicKey!,
        5 * LAMPORTS_PER_SOL,
      );

      return wrapTransactionWithNotification(provider.connection, promise, {
        pending: "Requesting Airdrop",
        success: `${symbol} Airdropped`,
        error: "Failed to airdrop",
      });
    },
  });

  if (mint !== SOL_MINT) {
    return <></>;
  }

  return (
    <SolidButton
      className="bg-slate-500 hover:bg-slate-200"
      onClick={() => airdropMutation.mutateAsync()}
    >
      Airdrop {getTokenSymbol(mint)}
    </SolidButton>
  );
}
