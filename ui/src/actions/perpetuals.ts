import { Program, utils } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";

import { AddCustodyParams } from "@/components/AddCustodyForm";
import IDL from "@/target/idl/perpetuals.json";
import { Perpetuals } from "@/target/types/perpetuals";

// HACK: While we fix permissions in contract, add the admin key as signer
const ADMIN_KEY = Keypair.fromSecretKey(
  Uint8Array.from([
    183, 13, 215, 80, 189, 232, 229, 6, 25, 69, 111, 201, 204, 18, 211, 180,
    253, 102, 28, 126, 32, 17, 186, 118, 230, 175, 73, 182, 154, 76, 5, 58, 238,
    215, 203, 153, 32, 45, 138, 121, 165, 249, 239, 34, 21, 133, 83, 189, 202,
    15, 40, 215, 125, 20, 63, 75, 106, 225, 11, 156, 176, 170, 182, 13,
  ]),
);
export const findPerpetualsAddressSync = (
  ...seeds: Array<Buffer | string | PublicKey>
) => {
  return PublicKey.findProgramAddressSync(
    seeds.map((x) => {
      if (typeof x === "string") {
        return utils.bytes.utf8.encode(x);
      }
      if (x instanceof PublicKey) {
        return x.toBuffer();
      }
      return x;
    }),
    new PublicKey(IDL.metadata.address),
  )[0];
};

const multisig = findPerpetualsAddressSync("multisig");
const perpetuals = findPerpetualsAddressSync("perpetuals");
const transferAuthority = findPerpetualsAddressSync("transfer_authority");

export async function addPool(
  program: Program<Perpetuals>,
  { name }: { name: string },
) {
  const pool = findPerpetualsAddressSync("pool", name);
  const lpTokenMint = findPerpetualsAddressSync("lp_token_mint", pool);

  return await program.methods
    .addPool({ name })
    .accounts({
      admin: ADMIN_KEY.publicKey,
      multisig,
      transferAuthority: transferAuthority,
      perpetuals: perpetuals,
      pool,
      lpTokenMint,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([ADMIN_KEY])
    .rpc();
}

export async function addCustody(
  program: Program<Perpetuals>,
  params: AddCustodyParams,
) {
  const pool = findPerpetualsAddressSync("pool", params.poolName);

  await program.methods
    .addCustody({
      isStable: params.isStable,
      isVirtual: params.isVirtual,
      oracle: {
        oracleAccount: params.tokenOracle,
        oracleType: params.oracleType,
        oracleAuthority: params.oracleAuthority,
        maxPriceAgeSec: params.maxPriceAgeSec,
        maxPriceError: params.maxPriceError,
      },
      pricing: params.pricingConfig,
      permissions: params.permissions,
      fees: params.fees,
      borrowRate: params.borrowRate,
    })
    .accounts({
      admin: ADMIN_KEY.publicKey,
      multisig,
      transferAuthority,
      perpetuals,
      pool,
      custody: findPerpetualsAddressSync("custody", pool, params.tokenMint),
      custodyTokenAccount: findPerpetualsAddressSync(
        "custody_token_account",
        pool,
        params.tokenMint,
      ),
      custodyTokenMint: params.tokenMint,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([ADMIN_KEY])
    .rpc();
}
