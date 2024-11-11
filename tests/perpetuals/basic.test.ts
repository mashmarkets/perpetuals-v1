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
import { BanksTransactionMeta, Clock, startAnchor } from "solana-bankrun";

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

  const getEvents = async (result: BanksTransactionMeta): Promise<Event[]> => {
    const coder = new anchor.EventParser(program.programId, program.coder);
    const events = await coder.parseLogs(result.logMessages ?? []);
    // Convert generator to array
    return Array.from(events);
  };

  let tc: TestClient;
  let oracleConfig;
  let pricing;
  let permissions;
  let fees;
  let borrowRate;
  let perpetualsExpected;
  let multisigExpected;
  let tokenExpected;
  let positionExpected;

  let setClock: (epoch: number) => Promise<void>;
  it("init", async () => {
    tc = new TestClient(context, program);
    tc.printErrors = true;
    await tc.initFixture();
    setClock = async (ms: number) => {
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
    await setClock(0);
    console.log("=== Fixtured done");
    await tc.init();

    // await expect(tc.init()).rejects.toThrow("already in use");
    tc.printErrors = false;
    await new Promise((r) => setTimeout(r, 10)); // Avoid transaction already processed
    await expect(tc.init()).rejects.toThrow("already in use");
    tc.printErrors = true;
    // let err = await tc.ensureFails(tc.init());
    // console.log(err.logs);
    // expect(err.logs[3]).includes("already in use");

    perpetualsExpected = {
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
      inceptionTime: new BN(0),
    };

    multisigExpected = {
      numSigners: 2,
      numSigned: 0,
      minSignatures: 2,
      instructionAccountsLen: 0,
      instructionDataLen: 0,
      instructionHash: new anchor.BN(0),
      signers: [
        tc.admins[0].publicKey,
        tc.admins[1].publicKey,
        PublicKey.default,
        PublicKey.default,
        PublicKey.default,
        PublicKey.default,
      ],
      signed: [0, 0, 0, 0, 0, 0],
      bump: tc.multisig.bump,
    };

    let multisig = await tc.program.account.multisig.fetch(
      tc.multisig.publicKey,
    );
    expect(JSON.stringify(multisig)).to.equal(JSON.stringify(multisigExpected));

    let perpetuals = await tc.program.account.perpetuals.fetch(
      tc.perpetuals.publicKey,
    );
    expect(JSON.stringify(perpetuals)).to.equal(
      JSON.stringify(perpetualsExpected),
    );
  });

  it("setAdminSigners", async () => {
    await tc.setAdminSigners(1);

    let multisig = await tc.program.account.multisig.fetch(
      tc.multisig.publicKey,
    );
    multisigExpected.minSignatures = 1;
    expect(JSON.stringify(multisig)).to.equal(JSON.stringify(multisigExpected));
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

    let perpetuals = await tc.program.account.perpetuals.fetch(
      tc.perpetuals.publicKey,
    );
    expect(JSON.stringify(perpetuals)).to.equal(
      JSON.stringify(perpetualsExpected),
    );
  });

  it("addAndRemovePool", async () => {
    await tc.addPool("test pool");

    let pool = await tc.program.account.pool.fetch(tc.pool.publicKey);
    let poolExpected = {
      name: "test pool",
      custodies: [],
      aumUsd: new BN(0),
      bump: tc.pool.bump,
      lpTokenBump: pool.lpTokenBump,
      inceptionTime: new BN(0),
    };
    expect(JSON.stringify(pool)).to.equal(JSON.stringify(poolExpected));

    await tc.removePool();
    await tc.ensureFails(tc.program.account.pool.fetch(tc.pool.publicKey));

    await tc.addPool("test pool");
  });

  it("addAndRemoveCustody", async () => {
    oracleConfig = {
      maxPriceError: new BN(10000),
      maxPriceAgeSec: 60,
      oracleType: { custom: {} },
      oracleAccount: tc.custodies[0].oracleAccount,
      oracleAuthority: tc.oracleAuthority.publicKey,
    };
    pricing = {
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
    permissions = {
      allowAddLiquidity: true,
      allowRemoveLiquidity: true,
      allowOpenPosition: true,
      allowClosePosition: true,
      allowPnlWithdrawal: true,
      allowCollateralWithdrawal: true,
      allowSizeChange: true,
    };
    fees = {
      utilizationMult: new BN(20000),
      addLiquidity: new BN(100),
      removeLiquidity: new BN(100),
      openPosition: new BN(100),
      closePosition: new BN(100),
      liquidation: new BN(100),
      protocolShare: new BN(10),
    };
    borrowRate = {
      baseRate: new BN(0),
      slope1: new BN(80000),
      slope2: new BN(120000),
      optimalUtilization: new BN(800000000),
    };
    await tc.addCustody(
      tc.custodies[0],
      oracleConfig,
      pricing,
      permissions,
      fees,
      borrowRate,
    );

    let token = await tc.program.account.custody.fetch(tc.custodies[0].custody);
    tokenExpected = {
      pool: tc.pool.publicKey,
      mint: tc.custodies[0].mint.publicKey,
      tokenAccount: tc.custodies[0].tokenAccount,
      decimals: 9,
      oracle: {
        oracleAccount: tc.custodies[0].oracleAccount,
        oracleType: { custom: {} },
        oracleAuthority: tc.oracleAuthority.publicKey,
        maxPriceError: "10000",
        maxPriceAgeSec: 60,
      },
      pricing: {
        useUnrealizedPnlInAum: true,
        tradeSpreadLong: "100",
        tradeSpreadShort: "100",
        minInitialLeverage: "10000",
        maxInitialLeverage: "1000000",
        maxLeverage: "1000000",
        maxPayoffMult: "10000",
        maxUtilization: "10000",
        maxPositionLockedUsd: "1000000000000",
        maxTotalLockedUsd: "1000000000000",
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
        utilizationMult: "20000",
        addLiquidity: "100",
        removeLiquidity: "100",
        openPosition: "100",
        closePosition: "100",
        liquidation: "100",
        protocolShare: "10",
      },
      borrowRate: {
        baseRate: "0",
        slope1: "80000",
        slope2: "120000",
        optimalUtilization: "800000000",
      },
      assets: {
        collateral: "0",
        protocolFees: "0",
        owned: "0",
        locked: "0",
      },
      collectedFees: {
        addLiquidityUsd: "0",
        removeLiquidityUsd: "0",
        openPositionUsd: "0",
        closePositionUsd: "0",
        liquidationUsd: "0",
      },
      volumeStats: {
        addLiquidityUsd: "0",
        removeLiquidityUsd: "0",
        openPositionUsd: "0",
        closePositionUsd: "0",
        liquidationUsd: "0",
      },
      tradeStats: {
        profitUsd: "0",
        lossUsd: "0",
        oiLongUsd: "0",
      },
      longPositions: {
        openPositions: "0",
        collateralUsd: "0",
        sizeUsd: "0",
        borrowSizeUsd: "0",
        lockedAmount: "0",
        weightedPrice: "0",
        totalQuantity: "0",
        cumulativeInterestUsd: "0",
        cumulativeInterestSnapshot: "0",
      },
      borrowRateState: {
        currentRate: "0",
        cumulativeInterest: "0",
        lastUpdate: "0",
      },
      bump: token.bump,
      tokenAccountBump: token.tokenAccountBump,
    };
    expect(JSON.stringify(token, null, 2)).to.equal(
      JSON.stringify(tokenExpected, null, 2),
    );

    let oracleConfig2 = Object.assign({}, oracleConfig);
    oracleConfig2.oracleAccount = tc.custodies[1].oracleAccount;
    await tc.addCustody(
      tc.custodies[1],
      oracleConfig2,
      pricing,
      permissions,
      fees,
      borrowRate,
    );

    await tc.removeCustody(tc.custodies[1]);
    await tc.ensureFails(
      tc.program.account.custody.fetch(tc.custodies[1].custody),
    );

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

    let token = await tc.program.account.custody.fetch(tc.custodies[0].custody);
    tokenExpected.oracle.maxPriceAgeSec = 90;
    tokenExpected.permissions.allowPnlWithdrawal = false;
    tokenExpected.fees.liquidation = "200";
    expect(JSON.stringify(token)).to.equal(JSON.stringify(tokenExpected));
  });

  it("setCustomOraclePrice", async () => {
    await tc.setCustomOraclePrice(123, tc.custodies[0]);
    await tc.setCustomOraclePrice(200, tc.custodies[1]);

    let oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );
    let oracleExpected = {
      price: new BN(123000),
      expo: -3,
      conf: new BN(0),
      publishTime: oracle.publishTime,
    };
    expect(JSON.stringify(oracle)).to.equal(JSON.stringify(oracleExpected));
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
    let oracleExpected = {
      price: new BN(500000),
      expo: -3,
      conf: new BN(10),
      publishTime: oracle.publishTime,
    };
    expect(JSON.stringify(oracle)).to.equal(JSON.stringify(oracleExpected));

    // Updating the permissionless price oracle with an older publish time should no-op.
    await tc.setCustomOraclePricePermissionless(
      tc.oracleAuthority,
      400,
      tc.custodies[0],
      oracle.publishTime.sub(new BN(20)),
    );
    oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );
    // Oracle's value is still 500 instead of the attempted 400.
    expect(JSON.stringify(oracle)).to.equal(JSON.stringify(oracleExpected));

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
    expect(JSON.stringify(oracle)).to.equal(
      JSON.stringify({
        ...oracleExpected,
        price: new BN(1000000),
        publishTime: oracle.publishTime,
      }),
    );

    // after test, set price back to the expected for other test cases.
    await tc.setCustomOraclePricePermissionless(
      tc.oracleAuthority,
      123,
      tc.custodies[0],
      tc.getTime() + 20,
    );
  });

  it("setCustomOraclePricePermissionless Errors", async () => {
    tc.printErrors = false;
    const oracle = await tc.program.account.customOracle.fetch(
      tc.custodies[0].oracleAccount,
    );
    const publishTime = oracle.publishTime.add(new BN(1));
    // Attempting to update with a payload signed by a bogus key should fail.
    let bogusKeypair = Keypair.generate();
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
    let randomMessage = Buffer.alloc(60);
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
    tc.printErrors = true;
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
    const ix = await tc.openPosition(
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
          borrowSizeUsd: BigInt("869610000000"),
          collateralAmount: BigInt("1000000000"),
          collateralUsd: BigInt("123000000000"),
          custody: tc.custodies[0].custody.toString(),
          lockedAmount: BigInt("7000000000"),
          time: BigInt("111"),
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: BigInt("124230000000"),
          sizeUsd: BigInt("869610000000"),
        },
        name: "openPosition",
      },
    ]);

    let position = await tc.program.account.position.fetch(
      tc.users[0].positionAccountsLong[0],
    );
    positionExpected = {
      owner: tc.users[0].wallet.publicKey.toBase58(),
      pool: tc.pool.publicKey.toBase58(),
      custody: tc.custodies[0].custody.toBase58(),
      openTime: "111",
      updateTime: "0",
      price: "124230000000",
      sizeUsd: "869610000000",
      borrowSizeUsd: "869610000000",
      collateralUsd: "123000000000",
      unrealizedProfitUsd: "0",
      unrealizedLossUsd: "0",
      cumulativeInterestSnapshot: "0",
      lockedAmount: "7000000000",
      collateralAmount: "1000000000",
      bump: position.bump,
    };

    expect(JSON.stringify(position)).to.equal(JSON.stringify(positionExpected));
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
    const ix = await tc.closePosition(
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
          collateralAmount: BigInt("1999991870"),
          custody: tc.custodies[0].custody.toString(),
          feeAmount: BigInt("70700000"),
          lossUsd: BigInt("25916100000"),
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: BigInt("121770000000"),
          profitUsd: BigInt("0"),
          protocolFee: BigInt("70700"),
          sizeUsd: BigInt("869610000000"),
          time: BigInt("111"),
          transferAmount: BigInt("1789291869"),
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
      await tc.openPosition(
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
    const ix = await tc.liquidate(
      tc.users[0],
      tc.users[0].tokenAccounts[0],
      tc.users[0].positionAccountsLong[0],
      tc.custodies[0],
    );
    const result = await processInstructions([ix]);
    expect(simplify(await getEvents(result))).toStrictEqual([
      {
        data: {
          collateralAmount: BigInt("1000000000"),
          custody: tc.custodies[0].custody.toString(),
          feeAmount: BigInt("217402500"),
          lossUsd: BigInt("332602200000"),
          owner: tc.users[0].wallet.publicKey.toString(),
          pool: tc.pool.publicKey.toString(),
          price: BigInt("80000"),
          profitUsd: BigInt("0"),
          protocolFee: BigInt("217403"),
          rewardAmount: BigInt("0"),
          signer: tc.users[0].wallet.publicKey.toString(),
          sizeUsd: BigInt("869610000000"),
          time: BigInt("111"),
          transferAmount: BigInt("0"),
        },
        name: "liquidatePosition",
      },
    ]);

    await expect(
      program.account.position.fetch(tc.users[0].positionAccountsLong[0]),
    ).rejects.toThrow("Could not find");
  });
});
