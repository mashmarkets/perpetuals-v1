import fs from "fs";
import { describe, expect, it } from "vitest";
import * as anchor from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { BankrunProvider } from "anchor-bankrun";
import { startAnchor } from "solana-bankrun";
import { getAccount, getMint } from "spl-token-bankrun";

import IDL from "../../../target/idl/simulator.json";
import type { Faucet } from "../../../target/types/faucet";

describe("Token Faucet", async () => {
  const context = await startAnchor(".", [], []);
  const provider = new BankrunProvider(context);

  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  const program = new anchor.Program<Faucet>(
    IDL as Faucet,
    IDL.metadata.address,
    provider,
  );

  const canonical = new PublicKey(
    "So11111111111111111111111111111111111111112",
  );
  // Derive the PDA to use as mint account address.
  // This same PDA is also used as the mint authority.
  const [mintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), canonical.toBuffer()],
    program.programId,
  );

  it("Create a token!", async () => {
    await program.methods
      .createToken(canonical, 5)
      .accounts({
        mintAccount: mintPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    expect(await getMint(context.banksClient, mintPDA)).toMatchObject({
      decimals: 5,
      freezeAuthority: null,
      isInitialized: true,
      mintAuthority: mintPDA,
      supply: BigInt(0),
    });
  });

  it("Mint 1 Token!", async () => {
    const associatedTokenAccountAddress = getAssociatedTokenAddressSync(
      mintPDA,
      payer.publicKey,
    );

    await program.methods
      .mintToken(canonical, new anchor.BN(1_000_000))
      .accounts({
        mint: mintPDA,
        associatedTokenAccount: associatedTokenAccountAddress,
      })
      .rpc();

    expect(
      await getAccount(context.banksClient, associatedTokenAccountAddress),
    ).toMatchObject({
      amount: BigInt(1_000_000),
      mint: mintPDA,
      owner: payer.publicKey,
    });
  });
});
