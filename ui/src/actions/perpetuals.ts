import {
  AnchorProvider,
  BN,
  Program,
  Provider,
  utils,
} from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
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
import { Custody, Pool, Position } from "@/hooks/perpetuals";
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

export const findPerpetualsPositionAddressSync = (
  user: PublicKey,
  poolAddress: PublicKey,
  custodyAddress: PublicKey,
) =>
  findPerpetualsAddressSync(
    "position",
    user,
    poolAddress,
    custodyAddress,
    new Uint8Array([1]),
  );

const multisig = findPerpetualsAddressSync("multisig");
const perpetuals = findPerpetualsAddressSync("perpetuals");
const transferAuthority = findPerpetualsAddressSync("transfer_authority");

// Careful - this mutates instructions
const addWrappedSolInstructions = (
  instructions: TransactionInstruction[],
  publicKey: PublicKey,
  lamports: bigint = BigInt(0),
) => {
  console.log("Adding wrapped sol instructions");
  const ata = getAssociatedTokenAddressSync(NATIVE_MINT, publicKey);
  const preInstructions = [
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey,
      ata,
      publicKey,
      NATIVE_MINT,
    ),
  ];

  // Send SOL to be wrapped if needed
  if (lamports > BigInt(0)) {
    preInstructions.push(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: ata,
        lamports,
      }),
      createSyncNativeInstruction(ata, TOKEN_PROGRAM_ID),
    );
  }

  // Close wrapped account
  const postInstructions = [
    createCloseAccountInstruction(ata, publicKey, publicKey),
  ];

  // Mutate instructions
  instructions.unshift(...preInstructions);
  instructions.push(...postInstructions);

  // Its a promise, incase in future we want to be smart about opening accounts
  return Promise.resolve(instructions);
};

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
  const signature = await connection.sendTransaction(signedTx);

  // Return this format as its best for waiting for confirmation
  return {
    signature: signature!,
    blockhash,
    lastValidBlockHeight,
  };
};

export async function addCollateral(
  program: Program<Perpetuals>,
  {
    position,
    custody,
    collateral,
  }: { position: Position; custody: Custody; collateral: bigint },
) {
  if (position.custody.toString() != custody.address.toString()) {
    throw new Error("Position and Custody do not match");
  }

  const instruction = await program.methods
    .addCollateral({
      collateral: new BN(collateral.toString()),
    })
    .accounts({
      owner: program.provider.publicKey,
      fundingAccount: getAssociatedTokenAddressSync(
        custody.mint,
        program.provider.publicKey!,
      ),
      transferAuthority,
      perpetuals,
      pool: position.pool,
      position: position.address,
      custody: custody.address,
      custodyOracleAccount: custody.oracle.oracleAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      custodyTokenAccount: findPerpetualsAddressSync(
        "custody_token_account",
        position.pool,
        custody.mint,
      ),
    })
    .instruction();

  const instructions = [instruction];

  if (NATIVE_MINT.equals(custody.mint)) {
    await addWrappedSolInstructions(
      instructions,
      program.provider.publicKey!,
      BigInt(collateral.toString()),
    );
  }

  return sendInstructions(program.provider, instructions);
}

export async function addCustody(
  program: Program<Perpetuals>,
  params: AddCustodyParams,
) {
  const pool = findPerpetualsAddressSync("pool", params.poolName);

  const instruction = await program.methods
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

  return sendInstructions(program.provider, [instruction], [ADMIN_KEY]);
}

export async function closePosition(
  program: Program<Perpetuals>,
  {
    position,
    custody,
    price,
  }: { position: Position; custody: Custody; price: bigint },
) {
  if (position.custody.toString() != custody.address.toString()) {
    throw new Error("Position and Custody do not match");
  }

  const instruction = await program.methods
    .closePosition({
      price: new BN(price.toString()),
    })
    .accounts({
      owner: program.provider.publicKey,
      receivingAccount: getAssociatedTokenAddressSync(
        custody.mint,
        program.provider.publicKey!,
      ),
      transferAuthority,
      perpetuals,
      pool: position.pool,
      position: position.address,
      custody: custody.address,
      custodyOracleAccount: custody.oracle.oracleAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      custodyTokenAccount: findPerpetualsAddressSync(
        "custody_token_account",
        position.pool,
        custody.mint,
      ),
    })
    .instruction();

  const instructions = [instruction];

  if (NATIVE_MINT.equals(custody.mint)) {
    await addWrappedSolInstructions(instructions, program.provider.publicKey!);
  }

  return sendInstructions(program.provider, instructions);
}

export async function addPoolAndCustody(
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

  return sendInstructions(
    program.provider,
    [addPoolIx, addCustodyIx],
    [ADMIN_KEY],
  );
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

  const position = findPerpetualsAddressSync(
    "position",
    program.provider.publicKey!,
    params.poolAddress,
    custody,
    new Uint8Array([1]),
  );
  const instruction = await program.methods
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
      position,
      custody,
      custodyOracleAccount: oracle,
      custodyTokenAccount: findPerpetualsAddressSync(
        "custody_token_account",
        params.poolAddress,
        params.mint,
      ),
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const instructions = [instruction];

  if (NATIVE_MINT.equals(params.mint)) {
    await addWrappedSolInstructions(
      instructions,
      program.provider.publicKey!,
      BigInt(params.collateral.toString()),
    );
  }

  return sendInstructions(program.provider, instructions);
}

async function getSimulationResult(
  program: Program<Perpetuals>,
  ix: TransactionInstruction,
) {
  const transaction = new VersionedTransaction(
    new TransactionMessage({
      payerKey: program.provider.publicKey!,
      // We don't need a real block as we simulating, but we need something to pass
      recentBlockhash: "So11111111111111111111111111111111111111112",
      instructions: [ix],
    }).compileToV0Message(),
  );
  const data = await program.provider.connection.simulateTransaction(
    transaction,
    {
      sigVerify: false,
      replaceRecentBlockhash: true,
    },
  );

  if (!data.value.returnData?.data[0]) {
    return undefined;
  }

  return data.value.returnData.data[0];
}

// This only works if the function returns struct
async function getParsedSimulationResult<T>(
  program: Program<Perpetuals>,
  ix: TransactionInstruction,
  name: string,
): Promise<T | undefined> {
  const returnType = IDL.instructions.find((f) => f.name === name)?.returns;
  if (returnType === undefined || typeof returnType === "string") {
    console.log(
      "Cannot find type name for instruction. Please check a struct is returned",
      name,
    );
    return undefined;
  }
  const typeName = returnType.defined;

  if (typeName === undefined) {
    console.log("Cannot find type name for instruction: ", name);
    return undefined;
  }

  const result = await getSimulationResult(program, ix);

  if (result === undefined) {
    console.log("No simulation result returned for instruction: ", name);
    return undefined;
  }

  return program.coder.types.decode(typeName, Buffer.from(result, "base64"));
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

export const getLiquidationPrice = async (
  program: Program<Perpetuals>,
  {
    position,
    custody,
    addCollateral = BigInt(0),
    removeCollateral = BigInt(0),
  }: {
    position: Position;
    custody: Custody;
    addCollateral?: bigint;
    removeCollateral?: bigint;
  },
) => {
  const instruction = await program.methods
    .getLiquidationPrice({
      addCollateral: new BN(addCollateral.toString()),
      removeCollateral: new BN(removeCollateral.toString()),
    })
    .accounts({
      perpetuals,
      pool: position.pool,
      position: position.address,
      custody: position.custody,
      custodyOracleAccount: custody.oracle.oracleAccount,
    })
    .instruction();

  const data = await getSimulationResult(program, instruction);

  if (data === undefined) {
    return undefined;
  }
  return BigInt(new BN(Buffer.from(data, "base64"), 10, "le").toString());
};

export const getAddLiquidityAmountAndFee = async (
  program: Program<Perpetuals>,
  {
    pool,
    custody,
    amountIn,
  }: {
    pool: Pick<Position, "address">;
    custody: Pick<Custody, "address"> & {
      oracle: Pick<Custody["oracle"], "oracleAccount">;
    };
    amountIn: bigint;
  },
) => {
  const instruction = await program.methods
    .getAddLiquidityAmountAndFee({
      amountIn: new BN(amountIn.toString()),
    })
    .accounts({
      perpetuals,
      pool: pool.address,
      custody: custody.address,
      custodyOracleAccount: custody.oracle.oracleAccount,
      lpTokenMint: findPerpetualsAddressSync("lp_token_mint", pool.address),
    })
    .remainingAccounts(getRemainingAccountsFromCustodies([custody]))
    .instruction();

  const estimate = await getParsedSimulationResult<{
    amount: BN;
    fee: BN;
  }>(program, instruction, "getAddLiquidityAmountAndFee");

  if (estimate === undefined) {
    throw new Error("Unable to get estimate");
  }

  return {
    amount: BigInt(estimate.amount.toString()),
    fee: BigInt(estimate.fee.toString()),
  };
};
export const getRemoveLiquidityAmountAndFee = async (
  program: Program<Perpetuals>,
  {
    pool,
    custody,
    lpAmountIn,
  }: {
    pool: Pick<Position, "address">;
    custody: Pick<Custody, "address"> & {
      oracle: Pick<Custody["oracle"], "oracleAccount">;
    };
    lpAmountIn: bigint;
  },
) => {
  const instruction = await program.methods
    .getRemoveLiquidityAmountAndFee({
      lpAmountIn: new BN(lpAmountIn.toString()),
    })
    .accounts({
      perpetuals,
      pool: pool.address,
      custody: custody.address,
      custodyOracleAccount: custody.oracle.oracleAccount,
      lpTokenMint: findPerpetualsAddressSync("lp_token_mint", pool.address),
    })
    .remainingAccounts([
      { pubkey: custody.address, isSigner: false, isWritable: true },
      {
        pubkey: custody.oracle.oracleAccount,
        isSigner: false,
        isWritable: true,
      },
    ])
    .instruction();

  const estimate = await getParsedSimulationResult<{
    amount: BN;
    fee: BN;
  }>(program, instruction, "getRemoveLiquidityAmountAndFee");

  if (estimate === undefined) {
    throw new Error("Unable to get estimate");
  }

  return {
    amount: BigInt(estimate.amount.toString()),
    fee: BigInt(estimate.fee.toString()),
  };
};

export const getPnl = async (
  program: Program<Perpetuals>,
  {
    position,
    custody,
  }: {
    position: Position;
    custody: Custody;
  },
) => {
  const instruction = await program.methods
    .getPnl({})
    .accounts({
      perpetuals,
      pool: position.pool,
      position: position.address,
      custody: position.custody,
      custodyOracleAccount: custody.oracle.oracleAccount,
    })
    .instruction();

  const estimate = await getParsedSimulationResult<{
    profit: BN;
    loss: BN;
  }>(program, instruction, "getPnl");

  if (estimate === undefined) {
    return {
      profit: BigInt(0),
      loss: BigInt(0),
    };
  }

  return {
    profit: BigInt(estimate.profit.toString()),
    loss: BigInt(estimate.loss.toString()),
  };
};

export async function removeCollateral(
  program: Program<Perpetuals>,
  {
    position,
    custody,
    collateralUsd,
  }: { position: Position; custody: Custody; collateralUsd: bigint },
) {
  if (position.custody.toString() != custody.address.toString()) {
    throw new Error("Position and Custody do not match");
  }

  const instruction = await program.methods
    .removeCollateral({
      collateralUsd: new BN(collateralUsd.toString()),
    })
    .accounts({
      owner: program.provider.publicKey,
      receivingAccount: getAssociatedTokenAddressSync(
        custody.mint,
        program.provider.publicKey!,
      ),
      transferAuthority,
      perpetuals,
      pool: position.pool,
      position: position.address,
      custody: custody.address,
      custodyOracleAccount: custody.oracle.oracleAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      custodyTokenAccount: findPerpetualsAddressSync(
        "custody_token_account",
        position.pool,
        custody.mint,
      ),
    })
    .instruction();

  const instructions = [instruction];

  if (NATIVE_MINT.equals(custody.mint)) {
    await addWrappedSolInstructions(instructions, program.provider.publicKey!);
  }

  return sendInstructions(program.provider, instructions);
}

const getRemainingAccountsFromCustodies = (
  custodies: Array<
    Pick<Custody, "address"> & {
      oracle: Pick<Custody["oracle"], "oracleAccount">;
    }
  >,
) => {
  return custodies.flatMap((custody) => [
    { pubkey: custody.address, isSigner: false, isWritable: true },
    {
      pubkey: custody.oracle.oracleAccount,
      isSigner: false,
      isWritable: true,
    },
  ]);
};
export async function addLiquidity(
  program: Program<Perpetuals>,
  {
    pool,
    custody,
    amountIn,
    mintLpAmountOut,
  }: {
    pool: Pool;
    custody: Custody;
    amountIn: bigint;
    mintLpAmountOut: bigint;
  },
) {
  if (pool.custodies[0]?.toString() !== custody.address.toString()) {
    throw new Error("Pool and Custody do not match");
  }
  const lpTokenMint = findPerpetualsAddressSync("lp_token_mint", pool.address);

  const fundingAccount = getAssociatedTokenAddressSync(
    custody.mint,
    program.provider.publicKey!,
  );

  const lpTokenAccount = getAssociatedTokenAddressSync(
    lpTokenMint,
    program.provider.publicKey!,
  );

  const instruction = await program.methods
    .addLiquidity({
      amountIn: new BN(amountIn.toString()),
      minLpAmountOut: new BN(mintLpAmountOut.toString()),
    })
    .accounts({
      owner: program.provider.publicKey,
      fundingAccount,
      lpTokenAccount,
      transferAuthority,
      perpetuals,
      pool: pool.address,
      custody: custody.address,
      custodyOracleAccount: custody.oracle.oracleAccount,
      custodyTokenAccount: custody.tokenAccount,
      lpTokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(getRemainingAccountsFromCustodies([custody]))
    .instruction();

  const instructions = [
    createAssociatedTokenAccountIdempotentInstruction(
      program.provider.publicKey!,
      lpTokenAccount,
      program.provider.publicKey!,
      lpTokenMint,
    ),
    instruction,
  ];

  if (NATIVE_MINT.equals(custody.mint)) {
    await addWrappedSolInstructions(
      instructions,
      program.provider.publicKey!,
      amountIn,
    );
  }

  return sendInstructions(program.provider, instructions);
}

export async function removeLiquidity(
  program: Program<Perpetuals>,
  {
    pool,
    custody,
    lpAmountIn,
    minAmountOut,
  }: {
    pool: Pool;
    custody: Custody;
    lpAmountIn: bigint;
    minAmountOut: bigint;
  },
) {
  if (pool.custodies[0]?.toString() !== custody.address.toString()) {
    throw new Error("Pool and Custody do not match");
  }
  const lpTokenMint = findPerpetualsAddressSync("lp_token_mint", pool.address);

  const receivingAccount = getAssociatedTokenAddressSync(
    custody.mint,
    program.provider.publicKey!,
  );

  const lpTokenAccount = getAssociatedTokenAddressSync(
    lpTokenMint,
    program.provider.publicKey!,
  );

  const instruction = await program.methods
    .removeLiquidity({
      lpAmountIn: new BN(lpAmountIn.toString()),
      minAmountOut: new BN(minAmountOut.toString()),
    })
    .accounts({
      owner: program.provider.publicKey,
      receivingAccount,
      lpTokenAccount,
      transferAuthority,
      perpetuals,
      pool: pool.address,
      custody: custody.address,
      custodyOracleAccount: custody.oracle.oracleAccount,
      custodyTokenAccount: custody.tokenAccount,
      lpTokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(getRemainingAccountsFromCustodies([custody]))
    .instruction();

  const instructions = [instruction];

  if (NATIVE_MINT.equals(custody.mint)) {
    await addWrappedSolInstructions(instructions, program.provider.publicKey!);
  }

  return sendInstructions(program.provider, instructions);
}

export const getAssetsUnderManagement = async (
  program: Program<Perpetuals>,
  {
    pool,
    custody,
  }: {
    pool: Pool;
    custody: Custody;
  },
) => {
  const instruction = await program.methods
    .getAssetsUnderManagement({})
    .accounts({
      perpetuals,
      pool: pool.address,
    })
    .remainingAccounts(getRemainingAccountsFromCustodies([custody]))
    .instruction();

  const data = await getSimulationResult(program, instruction);
  if (data === undefined) {
    return undefined;
  }

  return BigInt(new BN(Buffer.from(data, "base64"), 10, "le").toString());
};
