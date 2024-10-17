import { BN, Program, utils } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { AddCustodyParams } from "@/components/FormListAsset";
import { getTokenInfo } from "@/lib/Token";
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
  ...seeds: Array<Buffer | string | PublicKey | Uint8Array>
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

export async function listAsset(
  program: Program<Perpetuals>,
  params: AddCustodyParams,
) {
  const pool = findPerpetualsAddressSync("pool", params.poolName);
  const lpTokenMint = findPerpetualsAddressSync("lp_token_mint", pool);

  const addPoolIx = await program.methods
    .addPool({ name: params.poolName })
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
    .instruction();

  const addCustodyIx = await program.methods
    .addCustody({
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
    .instruction();

  const { blockhash, lastValidBlockHeight } =
    await program.provider.connection.getLatestBlockhash();

  const transaction = new VersionedTransaction(
    new TransactionMessage({
      payerKey: program.provider.publicKey!,
      recentBlockhash: blockhash,
      instructions: [addPoolIx, addCustodyIx],
    }).compileToV0Message(),
  );
  transaction.sign([ADMIN_KEY]);
  // send doens't seem to exist
  const [signature] = await program.provider.sendAll!([{ tx: transaction }]);

  return {
    signature: signature!,
    blockhash,
    lastValidBlockHeight,
  };
}

export interface OpenPositionParams {
  collateral: BN;
  mint: PublicKey;
  poolAddress: PublicKey;
  price: BN;
  size: BN;
}

export async function openPosition(
  program: Program<Perpetuals>,
  params: OpenPositionParams,
) {
  const {
    extensions: { oracle },
  } = getTokenInfo(params.mint);

  const custody = findPerpetualsAddressSync(
    "custody",
    params.poolAddress,
    params.mint,
  );

  return await program.methods
    .openPosition({
      price: params.price,
      collateral: params.collateral,
      size: params.size,
    })
    .accounts({
      owner: program.provider.publicKey,
      fundingAccount: getAssociatedTokenAddressSync(
        params.mint,
        program.provider.publicKey!,
      ),
      transferAuthority,
      perpetuals,
      pool: params.poolAddress,
      position: findPerpetualsAddressSync(
        "position",
        program.provider.publicKey!,
        params.poolAddress,
        custody,
        new Uint8Array([1]),
      ),
      custody,
      custodyOracleAccount: oracle,
      collateralCustody: custody,
      collateralCustodyOracleAccount: oracle,
      collateralCustodyTokenAccount: findPerpetualsAddressSync(
        "custody_token_account",
        params.poolAddress,
        params.mint,
      ),
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export async function getParsedSimulationResult<T>(
  program: Program<Perpetuals>,
  ix: TransactionInstruction,
  name: string,
): Promise<T | undefined> {
  const { blockhash } = await program.provider.connection.getLatestBlockhash();

  const transaction = new VersionedTransaction(
    new TransactionMessage({
      payerKey: program.provider.publicKey!,
      recentBlockhash: blockhash,
      instructions: [ix],
    }).compileToV0Message(),
  );

  const typeName = (
    program.idl.instructions.find((f) => f.name === name) as any
  )?.returns?.defined;

  if (typeName === undefined) {
    return undefined;
  }

  const data =
    await program.provider.connection.simulateTransaction(transaction);

  if (!data.value.returnData?.data[0]) {
    return undefined;
  }

  return program.coder.types.decode(
    typeName,
    Buffer.from(data.value.returnData.data[0], "base64"),
  );
}

export const getEntryPriceAndFee = async (
  program: Program<Perpetuals>,
  params: Omit<OpenPositionParams, "price">,
) => {
  const {
    extensions: { oracle },
  } = getTokenInfo(params.mint);

  const custody = findPerpetualsAddressSync(
    "custody",
    params.poolAddress,
    params.mint,
  );
  const instruction = await program.methods
    .getEntryPriceAndFee({
      collateral: params.collateral,
      size: params.size,
    })
    .accounts({
      perpetuals,
      pool: params.poolAddress,
      custody,
      custodyOracleAccount: oracle,
      collateralCustody: custody,
      collateralCustodyOracleAccount: oracle,
    })
    .instruction();

  const estimate = await getParsedSimulationResult<{
    entryPrice: BN;
    fee: BN;
    liquidationPrice: BN;
  }>(program, instruction, "getEntryPriceAndFee");

  if (estimate === undefined) {
    return {
      entryPrice: BigInt(0),
      fee: BigInt(0),
      liquidationPrice: BigInt(0),
    };
  }
  return {
    entryPrice: BigInt(estimate.entryPrice.toString()),
    fee: BigInt(estimate.fee.toString()),
    liquidationPrice: BigInt(estimate.liquidationPrice.toString()),
  };
};
