import { AnchorProvider, BN, Program, utils } from "@coral-xyz/anchor";
import { getPriceFeedAccountForProgram } from "@pythnetwork/pyth-solana-receiver";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import { Faucet, IDL } from "./target/faucet";

export const findFaucetAddressSync = (...seeds) =>
  PublicKey.findProgramAddressSync(
    seeds.map((x) => {
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
    new PublicKey(IDL.metadata.address),
  )[0];

export const findFaucetMint = (canonical: string, epoch: bigint) =>
  findFaucetAddressSync(
    "mint",
    new PublicKey(canonical),
    new BN(epoch.toString()),
  );

export const createFaucetProgram = (provider: AnchorProvider) => {
  return new Program<Faucet>(IDL as Faucet, IDL.metadata.address, provider);
};

export const oracleAdd = async (
  program: Program<Faucet>,
  params: {
    canonical: string;
    feedId: string;
    maxPriceAgeSec: bigint;
    shardId?: number;
  },
) => {
  const { feedId, shardId } = params;
  const canonical = new PublicKey(params.canonical);
  const maxPriceAgeSec = new BN(params.maxPriceAgeSec.toString());

  const priceUpdate = getPriceFeedAccountForProgram(shardId, feedId);

  return await program.methods
    .oracleAdd({
      canonical,
      maxPriceAgeSec,
      feedId,
    })
    .accounts({
      payer: program.provider.publicKey,
      oracle: findFaucetAddressSync("oracle", canonical),
      priceUpdate,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
};

export const mintCreate = async (
  program: Program<Faucet>,
  params: {
    amount: bigint;
    canonical: string;
    decimals: number;
    epoch: bigint;
  },
) => {
  const amount = new BN(params.amount.toString());
  const epoch = new BN(params.epoch.toString());
  const canonical = new PublicKey(params.canonical);

  const mint = findFaucetAddressSync("mint", canonical, epoch);
  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mint,
    program.provider.publicKey,
  );

  return await program.methods
    .mintCreate({
      canonical,
      decimals: params.decimals,
      amount,
      epoch,
    })
    .accounts({
      mint,
      associatedTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
};
