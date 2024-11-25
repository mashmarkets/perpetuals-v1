import { AnchorProvider, Provider } from "@coral-xyz/anchor";
import {
  Keypair,
  SendTransactionError,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

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
  const signature = await connection
    .sendTransaction(signedTx)
    .catch((error) => {
      if (
        error instanceof SendTransactionError &&
        error.message.includes("This transaction has already been processed")
      ) {
        // Seems like signTransaction broadcasts the transaction (might be dependent on wallet)
        // So catch the error and return the signature
        return bs58.encode(signedTx.signatures[0]); // Signature of tx is always the first signature
      }

      throw error;
    });

  // Return this format as its best for waiting for confirmation
  return {
    signature: signature!,
    blockhash,
    lastValidBlockHeight,
  };
};
