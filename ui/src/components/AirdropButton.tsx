import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createMintToInstruction } from "@/actions/faucet";
import { sendInstructions } from "@/actions/perpetuals";
import { usePrice } from "@/hooks/price";
import { useAnchorProvider } from "@/hooks/useProgram";
import { getTokenSymbol, tokens } from "@/lib/Token";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

import { SolidButton } from "./SolidButton";

function roundToOneSignificantFigure(num: number): number {
  if (num === 0) return 0; // Handle the case for 0 separately

  // Determine the factor by which to multiply to shift the decimal point to the right
  const exponent = Math.floor(Math.log10(Math.abs(num)));

  // Calculate the rounding factor
  const factor = Math.pow(10, exponent);

  // Use Math.ceil to round up and then scale back down by the factor
  return Math.ceil(num / factor) * factor;
}

export default function AirdropButton({
  mint,
  className,
}: {
  className?: string;
  mint: PublicKey;
}) {
  const queryClient = useQueryClient();
  const provider = useAnchorProvider();
  const { data: price } = usePrice(mint);

  const {
    symbol,
    decimals,
    extensions: { mainnet },
  } = tokens[mint.toString()]!;

  const amount = price
    ? roundToOneSignificantFigure(
        (10_000 / price.currentPrice) * 10 ** decimals,
      )
    : 0;

  const airdropMutation = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["balance", provider.publicKey?.toString(), mint?.toString()],
      });
    },
    mutationFn: async () => {
      if (provider === undefined || provider.publicKey === undefined) {
        return;
      }
      const promise =
        mint.toString() === "So11111111111111111111111111111111111111112"
          ? provider.connection.requestAirdrop(provider.publicKey!, 5 * 10 ** 9)
          : sendInstructions(provider, [
              createMintToInstruction({
                payer: provider.publicKey,
                seed: new PublicKey(mainnet),
                amount: new BN(amount),
              }),
            ]);

      return wrapTransactionWithNotification(provider.connection, promise, {
        pending: "Requesting Airdrop",
        success: `${symbol} Airdropped`,
        error: "Failed to airdrop",
      });
    },
  });

  return (
    <SolidButton
      className="my-6 w-full bg-slate-500 hover:bg-slate-200"
      onClick={() => airdropMutation.mutate()}
    >
      Airdrop {getTokenSymbol(mint)}
    </SolidButton>
  );
}
