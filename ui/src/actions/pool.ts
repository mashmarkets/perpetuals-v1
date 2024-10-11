import { Program, utils } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";

import { AddCustodyParams } from "@/components/AddCustodyForm";
import IDL from "@/target/idl/perpetuals.json";
import { Perpetuals } from "@/target/types/perpetuals";

const findPerpetualsAddressSync = (
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
  const admin = program.provider.publicKey;
  const pool = findPerpetualsAddressSync("pool", name);
  const lpTokenMint = findPerpetualsAddressSync("lp_token_mint", pool);

  return await program.methods
    .addPool({ name })
    .accounts({
      admin,
      multisig,
      transferAuthority: transferAuthority,
      perpetuals: perpetuals,
      pool,
      lpTokenMint,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
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
      ratios: params.ratios,
    })
    .accounts({
      admin: program.provider.publicKey,
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
    .rpc();
}
