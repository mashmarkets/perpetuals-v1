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
    tradeSpreadLong: new BN(0),
    tradeSpreadShort: new BN(0),
    minInitialLeverage: new BN(11_000),
    maxInitialLeverage: new BN(10_000_000),
    maxLeverage: new BN(20_000_000),
    maxPayoffMult: new BN(10_000),
    maxUtilization: new BN(9_000),
    maxPositionLockedUsd: new BN(1_000_000 * 10 ** USD_DECIMALS),
    maxTotalLockedUsd: new BN(1_000_000 * 10 ** USD_DECIMALS),
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
    utilizationMult: new BN(10_000),
    addLiquidity: new BN(0),
    removeLiquidity: new BN(20),
    openPosition: new BN(0),
    closePosition: new BN(10),
    liquidation: new BN(0),
    protocolShare: new BN(2_000),
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
      tradeSpreadLong: 0n,
      tradeSpreadShort: 0n,
      minInitialLeverage: 11_000n,
      maxInitialLeverage: 10_000_000n,
      maxLeverage: 20_000_000n,
      maxPayoffMult: 10_000n,
      maxUtilization: 9_000n,
      maxPositionLockedUsd: 1_000_000_000_000_000n,
      maxTotalLockedUsd: 1_000_000_000_000_000n,
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
      utilizationMult: 10000n,
      addLiquidity: 0n,
      removeLiquidity: 20n,
      openPosition: 0n,
      closePosition: 10n,
      liquidation: 0n,
      protocolShare: 2_000n,
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
      price: 123_000_000n,
      expo: -6,
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
      expo: -6,
      price: 500_000_000n,
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
      expo: -6,
      price: 500_000_000n,
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
      expo: -6,
      price: 1_000_000_000n,
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
      tc.toTokenAmount(100, tc.custodies[0].decimals),
      new BN(1),
      tc.users[0],
      tc.users[0].tokenAccounts[0],
      tc.custodies[0],
    );
    await tc.addLiquidity(
      tc.toTokenAmount(100, tc.custodies[1].decimals),
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
    const ix = await tc.openPositionInstruction({
      price: 125,
      collateral: tc.toTokenAmount(1, tc.custodies[0].decimals),
      size: tc.toTokenAmount(7, tc.custodies[0].decimals),
      user: tc.users[0],
      fundingAccount: tc.users[0].tokenAccounts[0],
      positionAccount: tc.users[0].positionAccountsLong[0],
      custody: tc.custodies[0],
    });

    const result = await processInstructions([ix]);
    expect(simplify(await getEvents(result))).toStrictEqual([
      {
        data: {
          borrowSizeUsd: 861000000000n,
          collateralAmount: 1000000000n,
          collateralUsd: 123000000000n,
          custody: tc.custodies[0].custody.toString(),
          lockedAmount: 7000000000n,
          time: 111n,
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: 123000000000n,
          sizeUsd: 861000000000n,
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
      borrowSizeUsd: 861000000000n,
      bump: expect.any(Number),
      collateralAmount: 1000000000n,
      collateralUsd: 123000000000n,
      cumulativeInterestSnapshot: 0n,
      custody: tc.custodies[0].custody.toString(),
      lockedAmount: 7000000000n,
      openTime: 111n,
      owner: tc.users[0].wallet.publicKey.toString(),
      pool: tc.pool.publicKey.toString(),
      price: 123000000000n,
      sizeUsd: 861000000000n,
      unrealizedLossUsd: 0n,
      unrealizedProfitUsd: 0n,
      updateTime: 0n,
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
      leverage: 70493n,
      liquidationPrice: 105613071429n,
      liquidationState: false,
      loss: 861000000n,
      markPrice: 123000000000n,
      margin: 35n,
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
          feeAmount: 7000000n,
          lossUsd: 861000000n,
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: 123000000000n,
          profitUsd: 0n,
          protocolFee: 1400000n,
          sizeUsd: 861000000000n,
          time: 111n,
          transferAmount: 1992991869n,
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
      await tc.openPositionInstruction({
        price: 125,
        collateral: tc.toTokenAmount(0.1, tc.custodies[0].decimals),
        size: tc.toTokenAmount(50, tc.custodies[0].decimals),
        user: tc.users[0],
        fundingAccount: tc.users[0].tokenAccounts[0],
        positionAccount: tc.users[0].positionAccountsLong[0],
        custody: tc.custodies[0],
      }),
    ]);

    await tc.setCustomOraclePrice(122.8154499999, tc.custodies[0]);

    const ix = await tc.liquidateInstruction({
      user: tc.users[0],
      tokenAccount: tc.users[0].tokenAccounts[0],
      positionAccount: tc.users[0].positionAccountsLong[0],
      custody: tc.custodies[0],
    });

    const result = await processInstructions([ix]);

    expect(simplify(await getEvents(result))).toStrictEqual([
      {
        data: {
          collateralAmount: 100000000n,
          custody: tc.custodies[0].custody.toString(),
          feeAmount: 1001502670n,
          lossUsd: 132227550090n,
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: 122815449n,
          profitUsd: 0n,
          protocolFee: 200300534n,
          rewardAmount: 0n,
          signer: tc.users[0].wallet.publicKey.toString(),
          sizeUsd: 6150000000000n,
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
