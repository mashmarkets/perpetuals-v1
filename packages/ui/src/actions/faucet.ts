import { BN, Program, utils } from "@coral-xyz/anchor";
import { Address } from "@solana/addresses";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import { Faucet } from "@/target/faucet";
import IDL from "@/target/faucet.json";

import { sendInstructions } from "./connection";

export const findFaucetAddressSync = (...seeds: unknown[]) => {
  const publicKey = PublicKey.findProgramAddressSync(
    seeds.map((x) => {
      if (x instanceof PublicKey) {
        return x.toBuffer();
      }
      if (typeof x === "string") {
        return utils.bytes.utf8.encode(x);
      }
      if (typeof x === "number" || x instanceof BN || x instanceof BigInt) {
        return new BN((x as number).toString()).toArrayLike(Buffer, "le", 8);
      }
      return x;
    }),
    new PublicKey(IDL.address),
  )[0];

  return publicKey.toString() as Address;
};
export const getFaucetMint = (canonical: Address, epoch: bigint) =>
  findFaucetAddressSync(
    "mint",
    new PublicKey(canonical),
    new BN(epoch.toString()),
  );

export const competitionEnter = async (
  program: Program<Faucet>,
  params: {
    amount: bigint;
    epoch: bigint;
  },
) => {
  const USDC_MINT = getFaucetMint(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as Address,
    params.epoch,
  );
  const epoch = new BN(params.epoch.toString());
  console.log("Entering competition with params", params);

  const publicKey = program.provider.publicKey!;
  const tokenAccountIn = getAssociatedTokenAddressSync(NATIVE_MINT, publicKey);
  const tokenAccountOut = getAssociatedTokenAddressSync(
    new PublicKey(USDC_MINT),
    publicKey,
  );
  const vault = findFaucetAddressSync("vault", NATIVE_MINT, epoch);

  const instructions = [
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey, // payer
      tokenAccountOut, // associatedToken
      publicKey, // owner
      new PublicKey(USDC_MINT), // mint
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey, // payer
      tokenAccountIn, // associatedToken
      publicKey, // owner
      NATIVE_MINT, // mint
    ),
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: tokenAccountIn,
      lamports: params.amount,
    }),
    createSyncNativeInstruction(tokenAccountIn),

    await program.methods
      .competitionEnter({
        amount: new BN(params.amount.toString()),
        epoch,
      })
      .accounts({
        payer: publicKey,
        mintIn: NATIVE_MINT,
        tokenAccountIn,
        vault,
        mintOut: USDC_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenAccountOut,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),

    createCloseAccountInstruction(
      tokenAccountIn, // account
      publicKey, // destination
      publicKey, // authority
    ),
  ];

  return sendInstructions(program.provider, instructions);
};

export const competitionClaim = async (
  program: Program<Faucet>,
  params: {
    epoch: bigint;
  },
) => {
  const USDC_MINT = getFaucetMint(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as Address,
    params.epoch,
  );

  const epoch = new BN(params.epoch.toString());

  const publicKey = program.provider.publicKey!;
  const tokenAccountIn = getAssociatedTokenAddressSync(
    new PublicKey(USDC_MINT),
    publicKey,
  );
  const tokenAccountOut = getAssociatedTokenAddressSync(
    new PublicKey(NATIVE_MINT),
    publicKey,
  );
  const vault = findFaucetAddressSync("vault", NATIVE_MINT, epoch);

  const instructions = [
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey, // payer
      tokenAccountOut, // associatedToken
      publicKey, // owner
      NATIVE_MINT, // mint
    ),

    await program.methods
      .competitionClaim({
        epoch,
      })
      .accounts({
        payer: publicKey,
        mintIn: USDC_MINT,
        tokenAccountIn,
        vault,
        competition: findFaucetAddressSync("competition", epoch),
        mintOut: NATIVE_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenAccountOut,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),

    createCloseAccountInstruction(
      tokenAccountOut, // account
      publicKey, // destination
      publicKey, // authority
    ),
  ];

  return sendInstructions(program.provider, instructions);
};
