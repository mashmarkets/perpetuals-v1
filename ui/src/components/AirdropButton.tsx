import { BN } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";

import { createMintToInstruction } from "@/actions/faucet";
import { usePrice } from "@/hooks/price";
import { getTokenSymbol, tokens } from "@/lib/Token";
import { sendSignedTransactionAndNotify } from "@/utils/TransactionHandlers";

import { SolidButton } from "./SolidButton";

function roundToOneSignificantFigure(num) {
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
  const client = useQueryClient();
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { data: price } = usePrice(mint);
  const {
    decimals,
    extensions: { mainnet },
  } = tokens[mint.toString()]!;

  const amount = price
    ? roundToOneSignificantFigure(
        (10_000 / price.currentPrice) * 10 ** decimals,
      )
    : 0;

  async function handleAirdrop() {
    if (!publicKey) return;
    if (mint.toString() === "So11111111111111111111111111111111111111112") {
      await connection.requestAirdrop(publicKey!, 5 * 10 ** 9);
    } else {
      let transaction = new Transaction();
      transaction = transaction.add(
        createMintToInstruction({
          payer: publicKey,
          seed: new PublicKey(mainnet),
          amount: new BN(amount),
        }),
      );
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash("finalized")
      ).blockhash;

      transaction = await signTransaction!(transaction);

      await sendSignedTransactionAndNotify({
        connection,
        transaction,
        successMessage: "Transaction success!",
        failMessage: "Failed to airdrop",
        signTransaction: () => {},
        enableSigning: false,
      });
    }

    client.invalidateQueries({
      queryKey: ["balance", publicKey.toString(), mint.toString()],
    });
  }

  // if (props.custody.getTokenE() === TokenE.USDC) {
  //   return (
  //     <a
  //       target="_blank"
  //       rel="noreferrer"
  //       href={"https://spl-token-faucet.com/?token-name=USDC-Dev"}
  //     >
  //       <SolidButton className="my-6 w-full bg-slate-500 hover:bg-slate-200">
  //         Airdrop {'"'}
  //         {getTokenLabel(props.custody.mint)}
  //         {'"'}
  //       </SolidButton>
  //     </a>
  //   );
  // }

  return (
    <SolidButton
      className="my-6 w-full bg-slate-500 hover:bg-slate-200"
      onClick={handleAirdrop}
    >
      Airdrop {getTokenSymbol(mint)}
    </SolidButton>
  );
}
