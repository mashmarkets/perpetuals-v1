import { BN, Event, EventParser, Program, utils } from "@coral-xyz/anchor";
import { Address, isAddress } from "@solana/addresses";
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
  VersionedTransactionResponse,
} from "@solana/web3.js";

import { AddCustodyParams } from "@/components/FormListAsset";
import { Custody, Pool, Position } from "@/hooks/perpetuals";
import { getTokenInfo } from "@/lib/Token";
import { MAX_U64 } from "@/lib/types";
import { Faucet } from "@/target/faucet";
import { Perpetuals } from "@/target/perpetuals";
import IDL from "@/target/perpetuals.json";

import { sendInstructions } from "./connection";
import { epochToBN, findFaucetAddressSync } from "./faucet";

console.log("Perpetuals Program ID: ", IDL.address);

// HACK: While we fix permissions in contract, add the admin key as signer
export const ADMIN_KEY = Keypair.fromSecretKey(
  Uint8Array.from([
    183, 13, 215, 80, 189, 232, 229, 6, 25, 69, 111, 201, 204, 18, 211, 180,
    253, 102, 28, 126, 32, 17, 186, 118, 230, 175, 73, 182, 154, 76, 5, 58, 238,
    215, 203, 153, 32, 45, 138, 121, 165, 249, 239, 34, 21, 133, 83, 189, 202,
    15, 40, 215, 125, 20, 63, 75, 106, 225, 11, 156, 176, 170, 182, 13,
  ]),
);
export const findPerpetualsAddressSync = (
  ...seeds: Array<Buffer | string | PublicKey | Uint8Array | Address>
) => {
  const publicKey = PublicKey.findProgramAddressSync(
    seeds.map((x) => {
      if (typeof x === "string" && isAddress(x)) {
        return new PublicKey(x).toBuffer();
      }

      if (x instanceof PublicKey) {
        return x.toBuffer();
      }
      if (typeof x === "string") {
        return utils.bytes.utf8.encode(x);
      }
      return x;
    }),
    new PublicKey(IDL.address),
  )[0];

  return publicKey.toString() as Address;
};

export const findPerpetualsPositionAddressSync = (
  user: PublicKey,
  poolAddress: Address,
  custodyAddress: Address,
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

export async function addCollateral(
  programs: {
    perpetuals: Program<Perpetuals>;
    faucet: Program<Faucet>;
  },
  params: {
    position: Position;
    custody: Custody;
    collateral: bigint;
    payMint: Address;
    epoch: Date;
  },
) {
  console.log("Adding collateral with params: ", params);
  const { perpetuals: program, faucet } = programs;
  const { position, custody, collateral } = params;
  if (position.custody.toString() != custody.address.toString()) {
    throw new Error("Position and Custody do not match");
  }
  const publicKey = program.provider.publicKey!;
  const payMint = new PublicKey(params.payMint);
  const mint = new PublicKey(params.custody.mint);

  // Precompute for swap
  const canonicalIn = new PublicKey(
    getTokenInfo(params.payMint, params.epoch).extensions.canonical,
  );
  const canonicalOut = new PublicKey(
    getTokenInfo(params.custody.mint, params.epoch).extensions.canonical,
  );
  const tokenAccountIn = getAssociatedTokenAddressSync(payMint, publicKey);
  const tokenAccountOut = getAssociatedTokenAddressSync(mint, publicKey);
  const priceUpdate = getTokenInfo(params.custody.mint, params.epoch).extensions
    .oracle;

  const instructions = [
    // Create account to hold position mint tokens
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey,
      tokenAccountOut,
      publicKey,
      mint,
    ),
    // Swap pay token to position toke
    await faucet.methods
      .swapBuy({
        amountOut: new BN(params.collateral.toString()),
        canonicalIn: canonicalIn,
        canonicalOut: canonicalOut,
        epoch: epochToBN(params.epoch),
      })
      .accounts({
        payer: publicKey,
        oracle: findFaucetAddressSync("oracle", canonicalOut),
        priceUpdate,
        mintIn: payMint,
        tokenAccountIn,
        mintOut: mint,
        tokenAccountOut,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),

    // Add the actual collateral
    await program.methods
      .addCollateral({
        collateral: new BN(collateral.toString()),
      })
      .accounts({
        owner: program.provider.publicKey,
        fundingAccount: getAssociatedTokenAddressSync(
          new PublicKey(custody.mint),
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
      .instruction(),

    // Close the token_account
    createCloseAccountInstruction(tokenAccountOut, publicKey, publicKey),
  ];

  // if (NATIVE_MINT.toString() === custody.mint) {
  //   await addWrappedSolInstructions(
  //     instructions,
  //     program.provider.publicKey!,
  //     BigInt(collateral.toString()),
  //   );
  // }

  return sendInstructions(program.provider, instructions);
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- This is anchor enum
type OracleType = { pyth: {} } | { custom: {} };
export async function addCustody(
  program: Program<Perpetuals>,
  params: AddCustodyParams,
) {
  const pool = new PublicKey(
    findPerpetualsAddressSync("pool", params.poolName),
  );

  const instruction = await program.methods
    .addCustody({
      oracle: {
        oracleType: { [params.oracle.oracleType]: {} } as OracleType,
        oracleAccount: new PublicKey(params.oracle.oracleAccount),
        oracleAuthority: new PublicKey(params.oracle.oracleAuthority as string),
        maxPriceAgeSec: params.oracle.maxPriceAgeSec,
        maxPriceError: new BN(params.oracle.maxPriceError.toString()),
      },
      pricing: {
        useUnrealizedPnlInAum: params.pricing.useUnrealizedPnlInAum,
        tradeSpreadLong: new BN(params.pricing.tradeSpreadLong.toString()),
        tradeSpreadShort: new BN(params.pricing.tradeSpreadShort.toString()),
        minInitialLeverage: new BN(
          params.pricing.minInitialLeverage.toString(),
        ),
        maxInitialLeverage: new BN(
          params.pricing.maxInitialLeverage.toString(),
        ),
        maxLeverage: new BN(params.pricing.maxLeverage.toString()),
        maxPayoffMult: new BN(params.pricing.maxPayoffMult.toString()),
        maxUtilization: new BN(params.pricing.maxUtilization.toString()),
        maxPositionLockedUsd: new BN(
          params.pricing.maxPositionLockedUsd.toString(),
        ),
        maxTotalLockedUsd: new BN(params.pricing.maxTotalLockedUsd.toString()),
      },
      permissions: params.permissions,
      fees: {
        utilizationMult: new BN(params.fees.utilizationMult.toString()),
        addLiquidity: new BN(params.fees.addLiquidity.toString()),
        removeLiquidity: new BN(params.fees.removeLiquidity.toString()),
        openPosition: new BN(params.fees.openPosition.toString()),
        closePosition: new BN(params.fees.closePosition.toString()),
        liquidation: new BN(params.fees.liquidation.toString()),
        protocolShare: new BN(params.fees.protocolShare.toString()),
      },
      borrowRate: {
        baseRate: new BN(params.borrowRate.baseRate.toString()),
        slope1: new BN(params.borrowRate.slope1.toString()),
        slope2: new BN(params.borrowRate.slope2.toString()),
        optimalUtilization: new BN(
          params.borrowRate.optimalUtilization.toString(),
        ),
      },
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
        new PublicKey(custody.mint),
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

  if (NATIVE_MINT.toString() === custody.mint) {
    await addWrappedSolInstructions(instructions, program.provider.publicKey!);
  }

  return sendInstructions(program.provider, instructions);
}
export async function closePositionWithSwap(
  programs: {
    perpetuals: Program<Perpetuals>;
    faucet: Program<Faucet>;
  },
  params: {
    custody: Custody;
    position: Position;
    price: bigint;
    receiveMint: Address;
    epoch: Date;
  },
) {
  const { perpetuals: program, faucet } = programs;
  const { receiveMint, position, custody, price, epoch } = params;

  console.log("Closing position with params", params);

  if (position.custody.toString() != custody.address.toString()) {
    throw new Error("Position and Custody do not match");
  }

  const publicKey = program.provider.publicKey!;
  // Precompute for swap
  const canonicalIn = new PublicKey(
    getTokenInfo(custody.mint, params.epoch).extensions.canonical,
  );

  const mintIn = new PublicKey(custody.mint);
  const mintOut = new PublicKey(receiveMint);
  const tokenAccountIn = getAssociatedTokenAddressSync(mintIn, publicKey);
  const tokenAccountOut = getAssociatedTokenAddressSync(mintOut, publicKey);
  const priceUpdate = getTokenInfo(custody.mint, params.epoch).extensions
    .oracle;

  const instructions = [
    // Create the ata
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey,
      tokenAccountIn,
      publicKey,
      new PublicKey(custody.mint),
    ),
    // Close the position
    await program.methods
      .closePosition({
        price: new BN(price.toString()),
      })
      .accounts({
        owner: program.provider.publicKey,
        receivingAccount: getAssociatedTokenAddressSync(
          new PublicKey(custody.mint),
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
      .instruction(),
    //Swap with max
    await faucet.methods
      .swapSell({
        amountIn: new BN(MAX_U64.toString()),
        canonicalIn,
        epoch: epochToBN(epoch),
      })
      .accounts({
        payer: publicKey,
        oracle: findFaucetAddressSync("oracle", canonicalIn),
        priceUpdate,
        mintIn,
        tokenAccountIn,
        mintOut,
        tokenAccountOut,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),
    // Close
    createCloseAccountInstruction(tokenAccountIn, publicKey, publicKey),
  ];

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
        oracleType: { [params.oracle.oracleType]: {} } as OracleType,
        oracleAccount: new PublicKey(params.oracle.oracleAccount),
        oracleAuthority: new PublicKey(params.oracle.oracleAuthority as string),
        maxPriceAgeSec: params.oracle.maxPriceAgeSec,
        maxPriceError: new BN(params.oracle.maxPriceError.toString()),
      },
      pricing: {
        useUnrealizedPnlInAum: params.pricing.useUnrealizedPnlInAum,
        tradeSpreadLong: new BN(params.pricing.tradeSpreadLong.toString()),
        tradeSpreadShort: new BN(params.pricing.tradeSpreadShort.toString()),
        minInitialLeverage: new BN(
          params.pricing.minInitialLeverage.toString(),
        ),
        maxInitialLeverage: new BN(
          params.pricing.maxInitialLeverage.toString(),
        ),
        maxLeverage: new BN(params.pricing.maxLeverage.toString()),
        maxPayoffMult: new BN(params.pricing.maxPayoffMult.toString()),
        maxUtilization: new BN(params.pricing.maxUtilization.toString()),
        maxPositionLockedUsd: new BN(
          params.pricing.maxPositionLockedUsd.toString(),
        ),
        maxTotalLockedUsd: new BN(params.pricing.maxTotalLockedUsd.toString()),
      },
      permissions: params.permissions,
      fees: {
        utilizationMult: new BN(params.fees.utilizationMult.toString()),
        addLiquidity: new BN(params.fees.addLiquidity.toString()),
        removeLiquidity: new BN(params.fees.removeLiquidity.toString()),
        openPosition: new BN(params.fees.openPosition.toString()),
        closePosition: new BN(params.fees.closePosition.toString()),
        liquidation: new BN(params.fees.liquidation.toString()),
        protocolShare: new BN(params.fees.protocolShare.toString()),
      },
      borrowRate: {
        baseRate: new BN(params.borrowRate.baseRate.toString()),
        slope1: new BN(params.borrowRate.slope1.toString()),
        slope2: new BN(params.borrowRate.slope2.toString()),
        optimalUtilization: new BN(
          params.borrowRate.optimalUtilization.toString(),
        ),
      },
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
  collateral: bigint;
  mint: Address;
  poolAddress: Address;
  price: bigint;
  size: bigint;
  epoch: Date;
}

export async function openPosition(
  program: Program<Perpetuals>,
  params: OpenPositionParams,
) {
  const {
    extensions: { oracle },
  } = getTokenInfo(params.mint, params.epoch);

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
      price: new BN(params.price.toString()),
      collateral: new BN(params.collateral.toString()),
      size: new BN(params.size.toString()),
    })
    .accounts({
      owner: program.provider.publicKey,
      fundingAccount: getAssociatedTokenAddressSync(
        new PublicKey(params.mint),
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

  if (NATIVE_MINT.toString() === params.mint) {
    await addWrappedSolInstructions(
      instructions,
      program.provider.publicKey!,
      BigInt(params.collateral.toString()),
    );
  }

  return sendInstructions(program.provider, instructions);
}

// Note this doesn't handle wrapping of sol if payMint is SOL
export async function openPositionWithSwap(
  programs: {
    perpetuals: Program<Perpetuals>;
    faucet: Program<Faucet>;
  },
  params: {
    collateral: bigint;
    mint: Address;
    payMint: Address;
    poolAddress: Address;
    price: bigint;
    size: bigint;
    epoch: Date;
  },
) {
  const { perpetuals: program, faucet } = programs;
  const mint = new PublicKey(params.mint);
  const payMint = new PublicKey(params.payMint);
  const {
    extensions: { oracle },
  } = getTokenInfo(params.mint, params.epoch);

  const publicKey = program.provider.publicKey!;
  // Precompute for swap
  const canonicalIn = new PublicKey(
    getTokenInfo(params.payMint, params.epoch).extensions.canonical,
  );
  const canonicalOut = new PublicKey(
    getTokenInfo(params.mint, params.epoch).extensions.canonical,
  );
  const tokenAccountIn = getAssociatedTokenAddressSync(payMint, publicKey);
  const tokenAccountOut = getAssociatedTokenAddressSync(mint, publicKey);
  const priceUpdate = getTokenInfo(params.mint, params.epoch).extensions.oracle;

  // Precomputed things for open position
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

  const instructions = [
    // Create account to hold position mint tokens
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey,
      tokenAccountOut,
      publicKey,
      mint,
    ),
    // Swap pay token to position toke
    await faucet.methods
      .swapBuy({
        amountOut: new BN(params.collateral.toString()),
        canonicalIn: canonicalIn,
        canonicalOut: canonicalOut,
        epoch: epochToBN(params.epoch),
      })
      .accounts({
        payer: publicKey,
        oracle: findFaucetAddressSync("oracle", canonicalOut),
        priceUpdate,
        mintIn: params.payMint,
        tokenAccountIn,
        mintOut: params.mint,
        tokenAccountOut,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),

    // Open the Position with our new position tokens
    await program.methods
      .openPosition({
        price: new BN(params.price.toString()),
        collateral: new BN(params.collateral.toString()),
        size: new BN(params.size.toString()),
      })
      .accounts({
        owner: program.provider.publicKey,
        fundingAccount: getAssociatedTokenAddressSync(
          new PublicKey(params.mint),
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
      .instruction(),

    // Close the token_account
    // TODO: Enable closing this once bug where liquidation doesn't completely empty the colateral account is fixed
    // createCloseAccountInstruction(tokenAccountOut, publicKey, publicKey),
  ];

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
    console.log("No simulation return data found");
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
  const instruction = IDL.instructions.find((f) => f.name === name);
  if (
    !instruction ||
    !("returns" in instruction) ||
    typeof instruction.returns === "string"
  ) {
    console.log(
      "Cannot find type name for instruction. Please check a struct is returned",
      name,
    );
    return undefined;
  }
  const typeName = instruction?.returns?.defined;

  if (typeName === undefined) {
    console.log("Cannot find type name for instruction: ", name);
    return undefined;
  }

  const result = await getSimulationResult(program, ix);

  if (result === undefined) {
    console.log("No simulation result returned for instruction: ", name);
    return undefined;
  }

  return program.coder.types.decode(
    typeName.name.charAt(0).toLowerCase() + typeName.name.slice(1),
    Buffer.from(result, "base64"),
  );
}

export const getEntryPriceAndFee = async (
  program: Program<Perpetuals>,
  params: Omit<OpenPositionParams, "price">,
) => {
  const {
    extensions: { oracle },
  } = getTokenInfo(params.mint, params.epoch);

  const custody = findPerpetualsAddressSync(
    "custody",
    params.poolAddress,
    params.mint,
  );
  const instruction = await program.methods
    .getEntryPriceAndFee({
      collateral: new BN(params.collateral.toString()),
      size: new BN(params.size.toString()),
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
  }>(program, instruction, "get_entry_price_and_fee");

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
  }>(program, instruction, "get_add_liquidity_amount_and_fee");

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
    .remainingAccounts(getRemainingAccountsFromCustodies([custody]))
    .instruction();

  const estimate = await getParsedSimulationResult<{
    amount: BN;
    fee: BN;
  }>(program, instruction, "get_remove_liquidity_amount_and_fee");

  if (estimate === undefined) {
    throw new Error("Unable to get estimate");
  }

  return {
    amount: BigInt(estimate.amount.toString()),
    fee: BigInt(estimate.fee.toString()),
  };
};

export async function removeCollateral(
  programs: {
    perpetuals: Program<Perpetuals>;
    faucet: Program<Faucet>;
  },
  params: {
    position: Position;
    custody: Custody;
    collateralUsd: bigint;
    receiveMint: Address;
    epoch: Date;
  },
) {
  const { perpetuals: program, faucet } = programs;
  const { position, custody, collateralUsd, receiveMint } = params;

  if (position.custody.toString() != custody.address.toString()) {
    throw new Error("Position and Custody do not match");
  }

  const publicKey = program.provider.publicKey!;
  // Precompute for swap
  const canonicalIn = new PublicKey(
    getTokenInfo(custody.mint, params.epoch).extensions.canonical,
  );
  const mintIn = new PublicKey(custody.mint);
  const mintOut = new PublicKey(receiveMint);
  const tokenAccountIn = getAssociatedTokenAddressSync(mintIn, publicKey);
  const tokenAccountOut = getAssociatedTokenAddressSync(mintOut, publicKey);
  const priceUpdate = getTokenInfo(custody.mint, params.epoch).extensions
    .oracle;

  const instructions = [
    // Create the ata
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey,
      tokenAccountIn,
      publicKey,
      new PublicKey(custody.mint),
    ),
    await program.methods
      .removeCollateral({
        collateralUsd: new BN(collateralUsd.toString()),
      })
      .accounts({
        owner: program.provider.publicKey,
        receivingAccount: getAssociatedTokenAddressSync(
          new PublicKey(custody.mint),
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
      .instruction(),
    //Swap with max
    await faucet.methods
      .swapSell({
        amountIn: new BN(MAX_U64.toString()),
        canonicalIn,
        epoch: epochToBN(params.epoch),
      })
      .accounts({
        payer: publicKey,
        oracle: findFaucetAddressSync("oracle", canonicalIn),
        priceUpdate,
        mintIn,
        tokenAccountIn,
        mintOut,
        tokenAccountOut,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),
    // Close
    createCloseAccountInstruction(tokenAccountIn, publicKey, publicKey),
  ];

  // if (NATIVE_MINT.toString() === custody.mint) {
  //   await addWrappedSolInstructions(instructions, program.provider.publicKey!);
  // }

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
    {
      pubkey: new PublicKey(custody.address),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: new PublicKey(custody.oracle.oracleAccount),
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
    new PublicKey(custody.mint),
    program.provider.publicKey!,
  );

  const lpTokenAccount = getAssociatedTokenAddressSync(
    new PublicKey(lpTokenMint),
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
      new PublicKey(lpTokenMint),
    ),
    instruction,
  ];

  if (NATIVE_MINT.toString() === custody.mint) {
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
    new PublicKey(custody.mint),
    program.provider.publicKey!,
  );

  const lpTokenAccount = getAssociatedTokenAddressSync(
    new PublicKey(lpTokenMint),
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
      lpTokenMint: lpTokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(getRemainingAccountsFromCustodies([custody]))
    .instruction();

  const instructions = [instruction];

  if (NATIVE_MINT.toString() === custody.mint) {
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

export const getPosition = async (
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
    .getPosition({})
    .accounts({
      perpetuals,
      pool: position.pool,
      position: position.address,
      custody: position.custody,
      custodyOracleAccount: custody.oracle.oracleAccount,
    })
    .instruction();

  const estimate = await getParsedSimulationResult<{
    leverage: BN;
    liquidationPrice: BN;
    liquidationState: boolean;
    markPrice: BN;
    loss: BN;
    margin: BN;
    profit: BN;
  }>(program, instruction, "get_position");

  if (estimate === undefined) {
    throw new Error("Unable to get position");
  }

  return {
    leverage: BigInt(estimate.leverage.toString()),
    liquidationPrice: BigInt(estimate.liquidationPrice.toString()),
    liquidationState: estimate.liquidationState,
    loss: BigInt(estimate.loss.toString()),
    margin: BigInt(estimate.margin.toString()),
    markPrice: BigInt(estimate.markPrice.toString()),
    profit: BigInt(estimate.profit.toString()),
  };
};

export const getPerpetualsEvents = async (
  program: Program<Perpetuals>,
  tx: VersionedTransactionResponse | null,
): Promise<Array<Event & VersionedTransactionResponse>> => {
  if (tx === null || tx === undefined) {
    return [];
  }

  const coder = new EventParser(program.programId, program.coder);
  const events = await coder.parseLogs(tx.meta?.logMessages ?? []);
  // Convert generator to array
  return Array.from(events).map((x) => ({ ...x, ...tx }));
};
