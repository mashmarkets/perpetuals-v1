import { AnchorProvider, Provider } from "@coral-xyz/anchor";
import {
  Keypair,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export const sendInstructions = async (
  provider: Provider,
  instructions: TransactionInstruction[],
  signers: Keypair[] = [],
) => {
  const wallet = (provider as AnchorProvider).wallet;
  const { connection, publicKey } = provider;

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const transaction = new VersionedTransaction(
    new TransactionMessage({
      payerKey: publicKey!,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(),
  );

  transaction.sign(signers);

  const signedTx = await wallet.signTransaction(transaction);
  const signature = await connection.sendTransaction(signedTx);

  // Return this format as its best for waiting for confirmation
  return {
    signature: signature!,
    blockhash,
    lastValidBlockHeight,
  };
};
