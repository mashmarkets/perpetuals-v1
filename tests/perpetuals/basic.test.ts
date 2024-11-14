import { describe, expect, it } from "vitest";
import * as anchor from "@coral-xyz/anchor";
import { Event } from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { BankrunProvider } from "anchor-bankrun";
import { deepmerge } from "deepmerge-ts";
import {
  BanksTransactionMeta,
  BanksTransactionResultWithMeta,
  Clock,
  startAnchor,
} from "solana-bankrun";

import IDL from "../../target/idl/perpetuals.json";
import { Perpetuals } from "../../target/types/perpetuals.js";
import { TestClient } from "./test_client.js";

const USD_DECIMALS = 9;

// Its difficult to debug differences in BN and PublicKey, so convert them to simplify types
const simplify = (x: unknown): any => {
  if (Array.isArray(x)) {
    return x.map(simplify);
  }

  if (x instanceof PublicKey) {
    return x.toString();
  }

  if (x instanceof BN) {
    return BigInt((x as BN).toString());
  }

  if (typeof x === "object" && x !== null) {
    return Object.fromEntries(
      Object.entries(x).map(([k, v]) => [k, simplify(v)]),
    );
  }

  return x;
};

describe("perpetuals", async () => {
  const context = await startAnchor(".", [], []);
  const provider = new BankrunProvider(context);

  const program = new Program<Perpetuals>(IDL as Perpetuals, provider);

  // Doesn't seem possible to fetch logs after the transaction is processed in bankrun
  // So need to process manually
  const processInstructions = async (ixs: TransactionInstruction[]) => {
    const recentBlockhash =
      (await context.banksClient.getLatestBlockhash())![0];

    const transaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: program.provider.publicKey!,
        recentBlockhash,
        instructions: ixs,
      }).compileToV0Message(),
    );

    transaction.sign([context.payer]);
    return await context.banksClient.processTransaction(transaction);
  };
  const simulateInstruction = async (ix: TransactionInstruction) => {
    const recentBlockhash =
      (await context.banksClient.getLatestBlockhash())![0];

    const transaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: program.provider.publicKey!,
        recentBlockhash,
        instructions: [ix],
      }).compileToV0Message(),
    );

    transaction.sign([context.payer]);
    return await context.banksClient.simulateTransaction(transaction);
  };

  const getEvents = async (result: BanksTransactionMeta): Promise<Event[]> => {
    const coder = new anchor.EventParser(program.programId, program.coder);
    const events = await coder.parseLogs(result.logMessages ?? []);
    // Convert generator to array
    return Array.from(events);
  };

  const parseResultFromLogs = (
    typeName: string,
    result: BanksTransactionResultWithMeta,
  ) => {
    const prefix = `Program return: ${program.programId.toString()} `;
    const returnData = result.meta?.logMessages.filter((x) =>
      x.startsWith(prefix),
    );
    const data = returnData?.map((x) => x.slice(prefix.length))[0];
    return program.coder.types.decode(typeName, Buffer.from(data!, "base64"));
  };

  const tc = new TestClient(context, program);
  tc.printErrors = true;
  // Setup
  await tc.initFixture();
  const admins = tc.admins;

  const oracleConfig = {
    maxPriceError: new BN(10000),
    maxPriceAgeSec: 60,
    oracleType: { custom: {} },
    oracleAccount: tc.custodies[0].oracleAccount,
    oracleAuthority: tc.oracleAuthority.publicKey,
  };
  const pricing = {
    useUnrealizedPnlInAum: true,
    tradeSpreadLong: new BN(100),
    tradeSpreadShort: new BN(100),
    minInitialLeverage: new BN(10000),
    maxInitialLeverage: new BN(1000000),
    maxLeverage: new BN(1000000),
    maxPayoffMult: new BN(10000),
    maxUtilization: new BN(10000),
    maxPositionLockedUsd: new BN(1000 * 10 ** USD_DECIMALS),
    maxTotalLockedUsd: new BN(1000 * 10 ** USD_DECIMALS),
  };
  const permissions = {
    allowAddLiquidity: true,
    allowRemoveLiquidity: true,
    allowOpenPosition: true,
    allowClosePosition: true,
    allowPnlWithdrawal: true,
    allowCollateralWithdrawal: true,
    allowSizeChange: true,
  };
  const fees = {
    utilizationMult: new BN(20000),
    addLiquidity: new BN(100),
    removeLiquidity: new BN(100),
    openPosition: new BN(100),
    closePosition: new BN(100),
    liquidation: new BN(100),
    protocolShare: new BN(10),
  };
  const borrowRate = {
    baseRate: new BN(0),
    slope1: new BN(80000),
    slope2: new BN(120000),
    optimalUtilization: new BN(800000000),
  };
  const perpetualsExpected = {
    permissions: {
      allowAddLiquidity: true,
      allowRemoveLiquidity: true,
      allowOpenPosition: true,
      allowClosePosition: true,
      allowPnlWithdrawal: true,
      allowCollateralWithdrawal: true,
      allowSizeChange: true,
    },
    pools: [],
    transferAuthorityBump: tc.authority.bump,
    perpetualsBump: tc.perpetuals.bump,
    inceptionTime: 0n,
  };

  const multisigExpected = {
    numSigners: 2,
    numSigned: 0,
    minSignatures: 2,
    instructionAccountsLen: 0,
    instructionDataLen: 0,
    instructionHash: 0n,
    signers: [
      tc.admins[0].publicKey.toString(),
      tc.admins[1].publicKey.toString(),
      PublicKey.default.toString(),
      PublicKey.default.toString(),
      PublicKey.default.toString(),
      PublicKey.default.toString(),
    ],
    signed: [0, 0, 0, 0, 0, 0],
    bump: tc.multisig.bump,
  };

  const tokenExpected = {
    pool: tc.pool.publicKey.toString(),
    mint: tc.custodies[0].mint.publicKey.toString(),
    tokenAccount: tc.custodies[0].tokenAccount.toString(),
    decimals: 9,
    oracle: {
      oracleAccount: tc.custodies[0].oracleAccount.toString(),
      oracleType: { custom: {} },
      oracleAuthority: tc.oracleAuthority.publicKey.toString(),
      maxPriceError: 10000n,
      maxPriceAgeSec: 60,
    },
    pricing: {
      useUnrealizedPnlInAum: true,
      tradeSpreadLong: 100n,
      tradeSpreadShort: 100n,
      minInitialLeverage: 10000n,
      maxInitialLeverage: 1000000n,
      maxLeverage: 1000000n,
      maxPayoffMult: 10000n,
      maxUtilization: 10000n,
      maxPositionLockedUsd: 1000000000000n,
      maxTotalLockedUsd: 1000000000000n,
    },
    permissions: {
      allowAddLiquidity: true,
      allowRemoveLiquidity: true,
      allowOpenPosition: true,
      allowClosePosition: true,
      allowPnlWithdrawal: true,
      allowCollateralWithdrawal: true,
      allowSizeChange: true,
    },
    fees: {
      utilizationMult: 20000n,
      addLiquidity: 100n,
      removeLiquidity: 100n,
      openPosition: 100n,
      closePosition: 100n,
      liquidation: 100n,
      protocolShare: 10n,
    },
    borrowRate: {
      baseRate: 0n,
      slope1: 80000n,
      slope2: 120000n,
      optimalUtilization: 800000000n,
    },
    assets: {
      collateral: 0n,
      protocolFees: 0n,
      owned: 0n,
      locked: 0n,
    },
    collectedFees: {
      addLiquidityUsd: 0n,
      removeLiquidityUsd: 0n,
      openPositionUsd: 0n,
      closePositionUsd: 0n,
      liquidationUsd: 0n,
    },
    volumeStats: {
      addLiquidityUsd: 0n,
      removeLiquidityUsd: 0n,
      openPositionUsd: 0n,
      closePositionUsd: 0n,
      liquidationUsd: 0n,
    },
    tradeStats: {
      profitUsd: 0n,
      lossUsd: 0n,
      oiLongUsd: 0n,
    },
    longPositions: {
      openPositions: 0n,
      collateralUsd: 0n,
      sizeUsd: 0n,
      borrowSizeUsd: 0n,
      lockedAmount: 0n,
      weightedPrice: 0n,
      totalQuantity: 0n,
      cumulativeInterestUsd: 0n,
      cumulativeInterestSnapshot: 0n,
    },
    borrowRateState: {
      currentRate: 0n,
      cumulativeInterest: 0n,
      lastUpdate: 0n,
    },
    bump: expect.any(Number),
    tokenAccountBump: expect.any(Number),
  };

  const setClock = async (ms: number) => {
    const currentClock = await context.banksClient.getClock();
    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        BigInt(ms),
      ),
    );
  };

  it("init", async () => {
    await setClock(0);
    await tc.init();

    const multisig = await tc.program.account.multisig.fetch(
      tc.multisig.publicKey,
    );
    expect(simplify(multisig)).toStrictEqual(multisigExpected);

    const perpetuals = await tc.program.account.perpetuals.fetch(
      tc.perpetuals.publicKey,
    );
    expect(simplify(perpetuals)).toStrictEqual(perpetualsExpected);
  });

  it("Can reject init twice", async () => {
    await expect(tc.init()).rejects.toThrow("already in use");
  });

  it("setAdminSigners", async () => {
    await tc.setAdminSigners(1);

    const multisig = await tc.program.account.multisig.fetch(
      tc.multisig.publicKey,
    );
    multisigExpected.minSignatures = 1;
    expect(simplify(multisig)).toStrictEqual(multisigExpected);
  });

  it("setPermissions", async () => {
    perpetualsExpected.permissions = {
      allowAddLiquidity: true,
      allowRemoveLiquidity: true,
      allowOpenPosition: true,
      allowClosePosition: true,
      allowPnlWithdrawal: true,
      allowCollateralWithdrawal: true,
      allowSizeChange: true,
    };
    await tc.setPermissions(perpetualsExpected.permissions);

    const perpetuals = await tc.program.account.perpetuals.fetch(
      tc.perpetuals.publicKey,
    );
    expect(simplify(perpetuals)).toStrictEqual(perpetualsExpected);
  });

  it("addAndRemovePool", async () => {
    await tc.addPool("test pool");

    expect(
      simplify(await tc.program.account.pool.fetch(tc.pool.publicKey)),
    ).toStrictEqual({
      name: "test pool",
      custodies: [],
      aumUsd: 0n,
      bump: tc.pool.bump,
      lpTokenBump: expect.any(Number),
      inceptionTime: 0n,
    });

    await tc.removePool();

    await expect(
      tc.program.account.pool.fetch(tc.pool.publicKey),
    ).rejects.toThrow("Could not find");

    await tc.addPool("test pool");
  });

  it("addAndRemoveCustody", async () => {
    await tc.addCustody(
      tc.custodies[0],
      oracleConfig,
      pricing,
      permissions,
      fees,
      borrowRate,
    );

    const token = await tc.program.account.custody.fetch(
      tc.custodies[0].custody,
    );
    expect(simplify(token)).toStrictEqual(tokenExpected);

    const oracleConfig2 = deepmerge({}, oracleConfig, {
      oracleAccount: tc.custodies[1].oracleAccount,
    });

    await tc.addCustody(
      tc.custodies[1],
      oracleConfig2,
      pricing,
      permissions,
      fees,
      borrowRate,
    );

    await tc.removeCustody(tc.custodies[1]);

    await expect(
      tc.program.account.custody.fetch(tc.custodies[1].custody),
    ).rejects.toThrow("Could not find");

    await tc.addCustody(
      tc.custodies[1],
      oracleConfig2,
      pricing,
      permissions,
      fees,
      borrowRate,
    );
  });

  it("setCustodyConfig", async () => {
    oracleConfig.maxPriceAgeSec = 90;
    permissions.allowPnlWithdrawal = false;
    fees.liquidation = new BN(200);
    await tc.setCustodyConfig(
      tc.custodies[0],
      oracleConfig,
      pricing,
      permissions,
      fees,
      borrowRate,
    );

    const token = await tc.program.account.custody.fetch(
      tc.custodies[0].custody,
    );
    expect(simplify(token)).toStrictEqual(
      deepmerge({}, tokenExpected, {
        oracle: {
          maxPriceAgeSec: 90,
        },
        permissions: {
          allowPnlWithdrawal: false,
        },
        fees: {
          liquidation: 200n,
        },
      }),
    );
  });

  it("setCustomOraclePrice", async () => {
    await tc.setCustomOraclePrice(123, tc.custodies[0]);
    await tc.setCustomOraclePrice(200, tc.custodies[1]);

    const oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );
    expect(simplify(oracle)).toStrictEqual({
      price: 123000n,
      expo: -3,
      conf: 0n,
      publishTime: BigInt(oracle.publishTime),
    });
  });

  it("setCustomOraclePricePermissionless", async () => {
    let oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );
    await tc.setCustomOraclePricePermissionless(
      tc.oracleAuthority,
      500,
      tc.custodies[0],
      oracle.publishTime.add(new BN(1)),
    );

    oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );

    expect(simplify(oracle)).toStrictEqual({
      conf: 10n,
      expo: -3,
      price: 500000n,
      publishTime: BigInt(oracle.publishTime),
    });

    // Updating the permissionless price oracle with an older publish time should no-op.
    await tc.setCustomOraclePricePermissionless(
      tc.oracleAuthority,
      400,
      tc.custodies[0],
      oracle.publishTime.sub(new BN(20)),
    );

    // Oracle's value is still 500 instead of the attempted 400.
    oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );

    expect(simplify(oracle)).toStrictEqual({
      conf: 10n,
      expo: -3,
      price: 500000n,
      publishTime: BigInt(oracle.publishTime),
    });

    // Try permissionless oracle update with increased & priority compute.
    await tc.setCustomOraclePricePermissionless(
      tc.oracleAuthority,
      1000,
      tc.custodies[0],
      oracle.publishTime.add(new BN(10)),
      null,
      null,
      true,
    );
    oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );

    expect(simplify(oracle)).toStrictEqual({
      conf: 10n,
      expo: -3,
      price: 1000000n,
      publishTime: BigInt(oracle.publishTime),
    });

    // after test, set price back to the expected for other test cases.
    await tc.setCustomOraclePricePermissionless(
      tc.oracleAuthority,
      123,
      tc.custodies[0],
      tc.getTime() + 20,
    );
  });

  it("setCustomOraclePricePermissionless Errors", async () => {
    const oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );
    const publishTime = oracle.publishTime.add(new BN(1));
    // Attempting to update with a payload signed by a bogus key should fail.
    const bogusKeypair = Keypair.generate();
    await expect(
      tc.setCustomOraclePricePermissionless(
        bogusKeypair,
        100,
        tc.custodies[1],
        publishTime,
      ),
    ).rejects.toThrow("PermissionlessOracleSignerMismatch");

    // Sending the permissionless update without signature verification should fail.
    await expect(
      tc.setCustomOraclePricePermissionless(
        tc.oracleAuthority,
        100,
        tc.custodies[1],
        publishTime,
        true,
      ),
    ).rejects.toThrow(/PermissionlessOracleMissingSignature/);

    // Sending the permissionless update with malformed message should fail.
    const randomMessage = Buffer.alloc(60);
    randomMessage.fill(0xab);
    await expect(
      tc.setCustomOraclePricePermissionless(
        tc.oracleAuthority,
        100,
        tc.custodies[1],
        publishTime,
        null,
        randomMessage,
      ),
    ).rejects.toThrow(/PermissionlessOracleMessageMismatch/);
  });

  it("setTestTime", async () => {
    // Legacy
    await setClock(111);
  });

  it("addLiquidity", async () => {
    await tc.addLiquidity(
      tc.toTokenAmount(10, tc.custodies[0].decimals),
      new BN(1),
      tc.users[0],
      tc.users[0].tokenAccounts[0],
      tc.custodies[0],
    );
    await tc.addLiquidity(
      tc.toTokenAmount(10, tc.custodies[1].decimals),
      new BN(1),
      tc.users[1],
      tc.users[1].tokenAccounts[1],
      tc.custodies[1],
    );
  });

  it("removeLiquidity", async () => {
    await tc.removeLiquidity(
      tc.toTokenAmount(1, 6),
      new BN(1),
      tc.users[0],
      tc.users[0].tokenAccounts[0],
      tc.custodies[0],
    );
    await tc.removeLiquidity(
      tc.toTokenAmount(1, 6),
      new BN(1),
      tc.users[1],
      tc.users[1].tokenAccounts[1],
      tc.custodies[1],
    );
  });

  it("openPosition", async () => {
    const ix = await tc.openPositionInstruction(
      125,
      tc.toTokenAmount(1, tc.custodies[0].decimals),
      tc.toTokenAmount(7, tc.custodies[0].decimals),
      tc.users[0],
      tc.users[0].tokenAccounts[0],
      tc.users[0].positionAccountsLong[0],
      tc.custodies[0],
    );

    const result = await processInstructions([ix]);
    expect(simplify(await getEvents(result))).toStrictEqual([
      {
        data: {
          borrowSizeUsd: 869610000000n,
          collateralAmount: 1000000000n,
          collateralUsd: 123000000000n,
          custody: tc.custodies[0].custody.toString(),
          lockedAmount: 7000000000n,
          time: 111n,
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: 124230000000n,
          sizeUsd: 869610000000n,
        },
        name: "openPosition",
      },
    ]);

    expect(
      simplify(
        await tc.program.account.position.fetch(
          tc.users[0].positionAccountsLong[0],
        ),
      ),
    ).toStrictEqual({
      owner: tc.users[0].wallet.publicKey.toString(),
      pool: tc.pool.publicKey.toString(),
      custody: tc.custodies[0].custody.toString(),
      openTime: 111n,
      updateTime: 0n,
      price: 124230000000n,
      sizeUsd: 869610000000n,
      borrowSizeUsd: 869610000000n,
      collateralUsd: 123000000000n,
      unrealizedProfitUsd: 0n,
      unrealizedLossUsd: 0n,
      cumulativeInterestSnapshot: 0n,
      lockedAmount: 7000000000n,
      collateralAmount: 1000000000n,
      bump: expect.any(Number),
    });
  });

  it("getPosition", async () => {
    const ix = await program.methods
      .getPosition({})
      .accounts({
        perpetuals: tc.perpetuals.publicKey,
        pool: tc.pool.publicKey,
        position: tc.users[0].positionAccountsLong[0],
        custody: tc.custodies[0].custody,
        custodyOracleAccount: tc.custodies[0].oracleAccount,
      })
      .instruction();
    const result = await simulateInstruction(ix);
    expect(
      simplify(parseResultFromLogs("getPositionResult", result)),
    ).toStrictEqual({
      leverage: 89573n,
      liquidationPrice: 109143171429n,
      liquidationState: false,
      loss: 25916100000n,
      markPrice: 123000000000n,
      margin: 895n,
      profit: 0n,
    });
  });

  it("addCollateral", async () => {
    await tc.addCollateral(
      tc.toTokenAmount(1, tc.custodies[0].decimals),
      tc.users[0],
      tc.users[0].tokenAccounts[0],
      tc.users[0].positionAccountsLong[0],
      tc.custodies[0],
    );
  });

  it("removeCollateral", async () => {
    await tc.removeCollateral(
      tc.toTokenAmount(1, 6),
      tc.users[0],
      tc.users[0].tokenAccounts[0],
      tc.users[0].positionAccountsLong[0],
      tc.custodies[0],
    );
  });

  it("closePosition", async () => {
    const ix = await tc.closePositionInstruction(
      1,
      tc.users[0],
      tc.users[0].tokenAccounts[0],
      tc.users[0].positionAccountsLong[0],
      tc.custodies[0],
    );
    const result = await processInstructions([ix]);
    expect(simplify(await getEvents(result))).toStrictEqual([
      {
        data: {
          collateralAmount: 1999991870n,
          custody: tc.custodies[0].custody.toString(),
          feeAmount: 70700000n,
          lossUsd: 25916100000n,
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: 121770000000n,
          profitUsd: 0n,
          protocolFee: 70700n,
          sizeUsd: 869610000000n,
          time: 111n,
          transferAmount: 1789291869n,
        },
        name: "closePosition",
      },
    ]);

    await expect(
      program.account.position.fetch(tc.users[0].positionAccountsLong[0]),
    ).rejects.toThrow("Could not find");
  });

  it("liquidate", async () => {
    await processInstructions([
      await tc.openPositionInstruction(
        125,
        tc.toTokenAmount(1, tc.custodies[0].decimals),
        tc.toTokenAmount(7, tc.custodies[0].decimals),
        tc.users[0],
        tc.users[0].tokenAccounts[0],
        tc.users[0].positionAccountsLong[0],
        tc.custodies[0],
      ),
    ]);

    await tc.setCustomOraclePrice(80, tc.custodies[0]);
    const ix = await tc.liquidateInstruction(
      tc.users[0],
      tc.users[0].tokenAccounts[0],
      tc.users[0].positionAccountsLong[0],
      tc.custodies[0],
    );
    const result = await processInstructions([ix]);
    expect(simplify(await getEvents(result))).toStrictEqual([
      {
        data: {
          collateralAmount: 1000000000n,
          custody: tc.custodies[0].custody.toString(),
          feeAmount: 217402500n,
          lossUsd: 332602200000n,
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: 80000n,
          profitUsd: 0n,
          protocolFee: 217403n,
          rewardAmount: 0n,
          signer: tc.users[0].wallet.publicKey.toString(),
          sizeUsd: 869610000000n,
          time: 111n,
          transferAmount: 0n,
        },
        name: "liquidatePosition",
      },
    ]);

    await expect(
      program.account.position.fetch(tc.users[0].positionAccountsLong[0]),
    ).rejects.toThrow("Could not find");
  });
});
