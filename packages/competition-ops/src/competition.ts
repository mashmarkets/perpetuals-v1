import { BN, Program } from "@coral-xyz/anchor";
import { Address } from "@solana/addresses";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import { findFaucetAddressSync, mintCreate } from "./faucet.js";
import { forceCloseAllPositions } from "./perpetuals.js";
import { Faucet } from "./target/faucet.js";
import { Perpetuals } from "./target/perpetuals.js";

export async function competitionStart(
  programs: {
    faucet: Program<Faucet>;
  },
  params: {
    epoch: Date;
  },
) {
  await mintCreate(programs.faucet, {
    amount: BigInt(0),
    canonical: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    epoch: params.epoch,
  }).then((sig) => console.log(`Created mint for USDC in faucet: ${sig}`));
}

export async function competitionEnd(
  programs: {
    perpetuals: Program<Perpetuals>;
    faucet: Program<Faucet>;
  },
  params: {
    epoch: Date;
  },
) {
  const { perpetuals, faucet } = programs;
  const { epoch } = params;

  const mint = findFaucetAddressSync(
    "mint",
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    epoch,
  );

  // Close all positions
  await forceCloseAllPositions(
    { perpetuals, faucet },
    {
      receiveMint: mint.toString() as Address,
      epoch,
    },
  );

  // Call faucet to "end" the competition
  await faucet.methods
    .competitionEnd({
      epoch: new BN(Math.floor(epoch.getTime() / 1000)),
    })
    .accounts({
      competition: findFaucetAddressSync("competition", epoch),
      vault: findFaucetAddressSync("vault", NATIVE_MINT, epoch),
      vaultMint: NATIVE_MINT,
      payer: faucet.provider.publicKey,
      mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc()
    .then((tx) =>
      console.log(`Competition ${params.epoch.toISOString()} ended: `, tx),
    );
}
