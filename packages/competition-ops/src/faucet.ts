import { AnchorProvider, BN, Program, utils } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import { Faucet } from "./target/faucet";
import IDL from "./target/faucet.json";

export const findFaucetAddressSync = (...seeds) =>
  PublicKey.findProgramAddressSync(
    seeds.map((x) => {
      if (x instanceof Date) {
        return new BN(Math.floor(x.getTime() / 1000)).toArrayLike(
          Buffer,
          "le",
          8,
        );
      }
      if (x instanceof PublicKey) {
        return x.toBuffer();
      }
      if (typeof x === "string") {
        return utils.bytes.utf8.encode(x);
      }
      if (typeof x === "number" || x instanceof BN) {
        return new BN(x.toString()).toArrayLike(Buffer, "le", 8);
      }
      return x;
    }),
    new PublicKey(IDL.address),
  )[0];

export const createFaucetProgram = (provider: AnchorProvider) => {
  return new Program<Faucet>(IDL as Faucet, provider);
};

export const mintCreate = async (
  program: Program<Faucet>,
  params: {
    amount: bigint;
    canonical: string;
    decimals: number;
    epoch: Date;
  },
) => {
  const amount = new BN(params.amount.toString());
  const epoch = new BN(Math.floor(params.epoch.getTime() / 1000));
  const canonical = new PublicKey(params.canonical);

  const mint = findFaucetAddressSync("mint", canonical, epoch);
  console.log(
    `Creating USDC for ${params.epoch.toLocaleString()}: `,
    mint.toString(),
  );
  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mint,
    program.provider.publicKey,
  );

  // Close the account if not minting anything.
  // This is mostly admin's empty USDC account won't show on leaderboard
  const postInstructions: TransactionInstruction[] = [];
  if (params.amount === BigInt(0)) {
    postInstructions.push(
      createCloseAccountInstruction(
        associatedTokenAccount, //account
        program.provider.publicKey, //destination
        program.provider.publicKey, //authority,
      ),
    );
  }

  return await program.methods
    .mintCreate({
      canonical,
      decimals: params.decimals,
      amount,
      epoch,
    })
    .postInstructions(postInstructions)
    .accounts({
      mint,
      associatedTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
};
