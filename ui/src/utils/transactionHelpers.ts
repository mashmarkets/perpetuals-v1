import {
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import { checkIfAccountExists } from "@/utils/retrieveData";

export async function createAtaIfNeeded(
  publicKey: PublicKey,
  payer: PublicKey,
  mint: PublicKey,
  connection: Connection,
): Promise<TransactionInstruction | null> {
  const associatedTokenAccount = await getAssociatedTokenAddress(
    mint,
    publicKey,
  );

  if (!(await checkIfAccountExists(associatedTokenAccount, connection))) {
    return createAssociatedTokenAccountInstruction(
      payer,
      associatedTokenAccount,
      publicKey,
      mint,
    );
  }

  return null;
}

export async function wrapSol(
  publicKey: PublicKey,
  payer: PublicKey,
  connection: Connection,
  payAmount: number,
): Promise<TransactionInstruction[] | null> {
  const associatedTokenAccount = await getAssociatedTokenAddress(
    NATIVE_MINT,
    publicKey,
  );

  return [
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: associatedTokenAccount,
      lamports: Math.floor(payAmount * LAMPORTS_PER_SOL),
    }),
    createSyncNativeInstruction(associatedTokenAccount, TOKEN_PROGRAM_ID),
  ];
}

export async function unwrapSol(
  publicKey: PublicKey,
  payer: PublicKey,
  connection: Connection,
): Promise<TransactionInstruction[] | null> {
  const associatedTokenAccount = await getAssociatedTokenAddress(
    NATIVE_MINT,
    publicKey,
  );
  return [
    createCloseAccountInstruction(associatedTokenAccount, publicKey, publicKey),
  ];
}
