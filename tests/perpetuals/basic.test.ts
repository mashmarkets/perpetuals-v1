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

import { BPS_DECIMALS, PRICE_DECIMALS } from "../../packages/ui/src/lib/types";
import { parseUnits } from "../../packages/ui/src/utils/viem";
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
    maxLeverage: new BN(100_000_000),
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
    liquidation: new BN(1),
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

  const CUSTODY_DECIMALS = 9;
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
      maxLeverage: 100_000_000n,
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
      liquidation: 1n,
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
    await tc.setAdminSigners({ minSignatures: 1 });

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
    await tc.setPermissions({ permissions: perpetualsExpected.permissions });

    const perpetuals = await tc.program.account.perpetuals.fetch(
      tc.perpetuals.publicKey,
    );
    expect(simplify(perpetuals)).toStrictEqual(perpetualsExpected);
  });

  it("addAndRemovePool", async () => {
    await tc.addPool({ name: "test pool" });

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

    await tc.addPool({ name: "test pool" });
  });

  it("addAndRemoveCustody", async () => {
    await tc.addCustody({
      custody: tc.custodies[0],
      oracle: oracleConfig,
      pricing,
      permissions,
      fees,
      borrowRate,
    });

    const token = await tc.program.account.custody.fetch(
      tc.custodies[0].custody,
    );
    expect(simplify(token)).toStrictEqual(tokenExpected);

    const oracleConfig2 = deepmerge({}, oracleConfig, {
      oracleAccount: tc.custodies[1].oracleAccount,
    });

    await tc.addCustody({
      custody: tc.custodies[1],
      oracle: oracleConfig2,
      pricing,
      permissions,
      fees,
      borrowRate,
    });

    await tc.removeCustody({ custody: tc.custodies[1] });

    await expect(
      tc.program.account.custody.fetch(tc.custodies[1].custody),
    ).rejects.toThrow("Could not find");

    await tc.addCustody({
      custody: tc.custodies[1],
      oracle: oracleConfig2,
      pricing,
      permissions,
      fees,
      borrowRate,
    });
  });

  it("setCustodyConfig", async () => {
    oracleConfig.maxPriceAgeSec = 90;
    permissions.allowPnlWithdrawal = false;
    await tc.setCustodyConfig({
      custody: tc.custodies[0],
      oracle: oracleConfig,
      pricing,
      permissions,
      fees,
      borrowRate,
    });

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
      }),
    );
  });

  it("setCustomOraclePrice", async () => {
    await tc.setCustomOraclePrice({
      price: parseUnits("123", 6),
      custody: tc.custodies[0],
    });
    await tc.setCustomOraclePrice({
      price: parseUnits("200", 6),
      custody: tc.custodies[1],
    });

    const oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );
    expect(simplify(oracle)).toStrictEqual({
      price: parseUnits("123.0", 6),
      expo: -6,
      conf: 0n,
      publishTime: BigInt(oracle.publishTime),
    });
  });

  it("setCustomOraclePricePermissionless", async () => {
    let oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );
    await tc.setCustomOraclePricePermissionless({
      oracleAuthority: tc.oracleAuthority,
      price: parseUnits("500", 6),
      custody: tc.custodies[0],
      publishTime: oracle.publishTime.add(new BN(1)),
    });

    oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );

    expect(simplify(oracle)).toStrictEqual({
      conf: 10n,
      expo: -6,
      price: parseUnits("500.0", 6),
      publishTime: BigInt(oracle.publishTime),
    });

    // Updating the permissionless price oracle with an older publish time should no-op.
    await tc.setCustomOraclePricePermissionless({
      oracleAuthority: tc.oracleAuthority,
      price: parseUnits("400", 6),
      custody: tc.custodies[0],
      publishTime: oracle.publishTime.sub(new BN(20)),
    });

    // Oracle's value is still 500 instead of the attempted 400.
    oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );

    expect(simplify(oracle)).toStrictEqual({
      conf: 10n,
      expo: -6,
      price: parseUnits("500.0", 6),
      publishTime: BigInt(oracle.publishTime),
    });

    // Try permissionless oracle update with increased & priority compute.
    await tc.setCustomOraclePricePermissionless({
      oracleAuthority: tc.oracleAuthority,
      price: parseUnits("1000", 6),
      custody: tc.custodies[0],
      publishTime: oracle.publishTime.add(new BN(10)),
      shouldIncreaseComputeLimits: true,
    });
    oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );

    expect(simplify(oracle)).toStrictEqual({
      conf: 10n,
      expo: -6,
      price: parseUnits("1000.0", 6),
      publishTime: BigInt(oracle.publishTime),
    });

    // after test, set price back to the expected for other test cases.
    await tc.setCustomOraclePricePermissionless({
      oracleAuthority: tc.oracleAuthority,
      price: parseUnits("123", 6),
      custody: tc.custodies[0],
      publishTime: tc.getTime() + 20,
    });
  });

  it("setCustomOraclePricePermissionless Errors", async () => {
    const oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );
    const publishTime = oracle.publishTime.add(new BN(1));
    // Attempting to update with a payload signed by a bogus key should fail.
    const bogusKeypair = Keypair.generate();
    await expect(
      tc.setCustomOraclePricePermissionless({
        oracleAuthority: bogusKeypair,
        price: parseUnits("100", 6),
        custody: tc.custodies[1],
        publishTime,
      }),
    ).rejects.toThrow("PermissionlessOracleSignerMismatch");

    // Sending the permissionless update without signature verification should fail.
    await expect(
      tc.setCustomOraclePricePermissionless({
        oracleAuthority: tc.oracleAuthority,
        price: parseUnits("100", 6),
        custody: tc.custodies[1],
        publishTime,
        shouldIncludeSignatureVerification: false,
      }),
    ).rejects.toThrow(/PermissionlessOracleMissingSignature/);

    // Sending the permissionless update with malformed message should fail.
    const randomMessage = Buffer.alloc(60);
    randomMessage.fill(0xab);
    await expect(
      tc.setCustomOraclePricePermissionless({
        oracleAuthority: tc.oracleAuthority,
        price: parseUnits("100", 6),
        custody: tc.custodies[1],
        publishTime,
        messageOverwrite: randomMessage,
      }),
    ).rejects.toThrow(/PermissionlessOracleMessageMismatch/);
  });

  it("setTestTime", async () => {
    // Legacy
    await setClock(111);
  });

  it("addLiquidity", async () => {
    await tc.addLiquidity({
      amountIn: tc.toTokenAmount(100, tc.custodies[0].decimals),
      minLpAmountOut: new BN(1),
      user: tc.users[0],
      fundingAccount: tc.users[0].tokenAccounts[0],
      custody: tc.custodies[0],
    });
    await tc.addLiquidity({
      amountIn: tc.toTokenAmount(100, tc.custodies[1].decimals),
      minLpAmountOut: new BN(1),
      user: tc.users[1],
      fundingAccount: tc.users[1].tokenAccounts[1],
      custody: tc.custodies[1],
    });
  });

  it("removeLiquidity", async () => {
    await tc.removeLiquidity({
      lpAmountIn: tc.toTokenAmount(1, 6),
      minAmountOut: new BN(1),
      user: tc.users[0],
      receivingAccount: tc.users[0].tokenAccounts[0],
      custody: tc.custodies[0],
    });
    await tc.removeLiquidity({
      lpAmountIn: tc.toTokenAmount(1, 6),
      minAmountOut: new BN(1),
      user: tc.users[1],
      receivingAccount: tc.users[1].tokenAccounts[1],
      custody: tc.custodies[1],
    });
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
          borrowSizeUsd: parseUnits("861.000000000", USD_DECIMALS),
          collateralAmount: parseUnits("1.000000000", CUSTODY_DECIMALS),
          collateralUsd: parseUnits("123.000000000", USD_DECIMALS),
          custody: tc.custodies[0].custody.toString(),
          lockedAmount: parseUnits("7.000000000", CUSTODY_DECIMALS),
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: parseUnits("123.000000000", PRICE_DECIMALS),
          sizeUsd: parseUnits("861.000000000", USD_DECIMALS),
          time: 111n,
          transferAmount: parseUnits("1.000000000", CUSTODY_DECIMALS),
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
      borrowSizeUsd: parseUnits("861.000000000", USD_DECIMALS),
      bump: expect.any(Number),
      collateralAmount: parseUnits("1.000000000", CUSTODY_DECIMALS),
      collateralUsd: parseUnits("123.000000000", USD_DECIMALS),
      cumulativeInterestSnapshot: 0n,
      custody: tc.custodies[0].custody.toString(),
      lockedAmount: parseUnits("7.000000000", CUSTODY_DECIMALS),
      openTime: 111n,
      owner: tc.users[0].wallet.publicKey.toString(),
      pool: tc.pool.publicKey.toString(),
      price: parseUnits("123.000000000", PRICE_DECIMALS),
      sizeUsd: parseUnits("861.000000000", USD_DECIMALS),
      unrealizedLossUsd: parseUnits("0", USD_DECIMALS),
      unrealizedProfitUsd: parseUnits("0", USD_DECIMALS),
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
      leverage: parseUnits("7.0000", BPS_DECIMALS),
      liquidationPrice: parseUnits("105.440871429", PRICE_DECIMALS),
      liquidationState: false,
      loss: parseUnits("0", USD_DECIMALS),
      markPrice: parseUnits("123.000000000", PRICE_DECIMALS),
      margin: parseUnits("0.0007", BPS_DECIMALS),
      profit: parseUnits("0", USD_DECIMALS),
    });
  });

  it("addCollateral", async () => {
    const ix = await tc.addCollateralInstruction({
      collateral: tc.toTokenAmount(1, tc.custodies[0].decimals),
      user: tc.users[0],
      fundingAccount: tc.users[0].tokenAccounts[0],
      positionAccount: tc.users[0].positionAccountsLong[0],
      custody: tc.custodies[0],
    });
    const result = await processInstructions([ix]);
    expect(simplify(await getEvents(result))).toStrictEqual([
      {
        data: {
          collateralAmount: parseUnits("2.000000000", CUSTODY_DECIMALS),
          custody: tc.custodies[0].custody.toString(),
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: parseUnits("123.000000000", PRICE_DECIMALS),
          sizeUsd: parseUnits("861.000000000", USD_DECIMALS),
          time: 111n,
          transferAmount: parseUnits("1.000000000", CUSTODY_DECIMALS),
        },
        name: "addCollateral",
      },
    ]);
  });

  it("removeCollateral", async () => {
    const ix = await tc.removeCollateralInstruction({
      collateralUsd: tc.toTokenAmount(1, 6),
      user: tc.users[0],
      receivingAccount: tc.users[0].tokenAccounts[0],
      positionAccount: tc.users[0].positionAccountsLong[0],
      custody: tc.custodies[0],
    });

    const result = await processInstructions([ix]);
    expect(simplify(await getEvents(result))).toStrictEqual([
      {
        data: {
          collateralAmount: parseUnits("1.999991870", CUSTODY_DECIMALS),
          custody: tc.custodies[0].custody.toString(),
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: parseUnits("123.000000000", PRICE_DECIMALS),
          sizeUsd: parseUnits("861.000000000", USD_DECIMALS),
          time: 111n,
          transferAmount: parseUnits("0.000008130", CUSTODY_DECIMALS),
        },
        name: "removeCollateral",
      },
    ]);
  });

  it("closePosition", async () => {
    const ix = await tc.closePositionInstruction({
      price: 1,
      user: tc.users[0],
      receivingAccount: tc.users[0].tokenAccounts[0],
      positionAccount: tc.users[0].positionAccountsLong[0],
      custody: tc.custodies[0],
    });
    const result = await processInstructions([ix]);
    expect(simplify(await getEvents(result))).toStrictEqual([
      {
        data: {
          collateralAmount: parseUnits("1.999991870", CUSTODY_DECIMALS),
          custody: tc.custodies[0].custody.toString(),
          feeAmount: parseUnits("0", CUSTODY_DECIMALS),
          lossUsd: parseUnits("0", USD_DECIMALS),
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: parseUnits("123.000000000", PRICE_DECIMALS),
          profitUsd: parseUnits("0", USD_DECIMALS),
          protocolFee: parseUnits("0", CUSTODY_DECIMALS),
          sizeUsd: parseUnits("861.000000000", USD_DECIMALS),
          time: 111n,
          transferAmount: parseUnits("1.999991869", CUSTODY_DECIMALS),
        },
        name: "closePosition",
      },
    ]);

    await expect(
      program.account.position.fetch(tc.users[0].positionAccountsLong[0]),
    ).rejects.toThrow("Could not find");
  });

  it("liquidate", async () => {
    await tc.setCustomOraclePrice({
      price: parseUnits("125.0", 6),
      custody: tc.custodies[0],
    });
    await processInstructions([
      await tc.openPositionInstruction({
        price: 125,
        collateral: tc.toTokenAmount(0.01, tc.custodies[0].decimals),
        size: tc.toTokenAmount(10, tc.custodies[0].decimals),
        user: tc.users[0],
        fundingAccount: tc.users[0].tokenAccounts[0],
        positionAccount: tc.users[0].positionAccountsLong[0],
        custody: tc.custodies[0],
      }),
    ]);

    await tc.setCustomOraclePrice({
      price: parseUnits("124.8875", 6) - 1n,
      custody: tc.custodies[0],
    });
    const getPosition = await simulateInstruction(
      await program.methods
        .getPosition({})
        .accounts({
          perpetuals: tc.perpetuals.publicKey,
          pool: tc.pool.publicKey,
          position: tc.users[0].positionAccountsLong[0],
          custody: tc.custodies[0].custody,
          custodyOracleAccount: tc.custodies[0].oracleAccount,
        })
        .instruction(),
    );
    expect(
      simplify(parseResultFromLogs("getPositionResult", getPosition)),
    ).toStrictEqual({
      leverage: parseUnits("10000.8000", BPS_DECIMALS),
      liquidationPrice: parseUnits("124.8875", PRICE_DECIMALS),
      liquidationState: true,
      loss: parseUnits("1.12501", USD_DECIMALS),
      markPrice: parseUnits("124.88749900", PRICE_DECIMALS),
      margin: parseUnits("1.00", BPS_DECIMALS),
      profit: parseUnits("0", USD_DECIMALS),
    });

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
          collateralAmount: parseUnits("0.0100000000", CUSTODY_DECIMALS),
          custody: tc.custodies[0].custody.toString(),
          feeAmount: parseUnits("0.00100090", CUSTODY_DECIMALS),
          lossUsd: parseUnits("1.250010022", USD_DECIMALS),
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: parseUnits("124.88749900", PRICE_DECIMALS),
          profitUsd: parseUnits("0", USD_DECIMALS),
          protocolFee: parseUnits("0.000200180", CUSTODY_DECIMALS),
          rewardAmount: parseUnits("0", CUSTODY_DECIMALS),
          signer: tc.users[0].wallet.publicKey.toString(),
          sizeUsd: parseUnits("1250.000000000", USD_DECIMALS),
          time: 111n,
          transferAmount: parseUnits("0", CUSTODY_DECIMALS),
        },
        name: "liquidatePosition",
      },
    ]);

    await expect(
      program.account.position.fetch(tc.users[0].positionAccountsLong[0]),
    ).rejects.toThrow("Could not find");
  });
});
