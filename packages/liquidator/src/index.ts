import { createRequire } from "node:module";
import {
  AnchorProvider,
  BN,
  IdlAccounts,
  Program,
  ProgramAccount,
  utils,
  Wallet,
} from "@coral-xyz/anchor";
import { Address, isAddress } from "@solana/addresses";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import axios from "axios";
import { memoize } from "lodash-es";
import { setIntervalAsync } from "set-interval-async/dynamic";

import { env } from "./env.js";
import { Perpetuals } from "./target/perpetuals.js";
// @ts-ignore 
import IDL from "./target/perpetuals.json" with { type: "json" }
import { getProgramIdFromUrl, notify, sleep } from "./utils.js";

// Related to https://github.com/jhurliman/node-rate-limiter/issues/80
const require = createRequire(import.meta.url);
const RateLimiter = require("limiter").RateLimiter;

const fromBN = (v: BN) => BigInt(v.toString());
const parsePosition = (
  data: ProgramAccount<IdlAccounts<Perpetuals>["position"]>,
) => {
  const p = data.account;
  return {
    address: data.publicKey.toString() as Address,
    borrowSizeUsd: fromBN(p.borrowSizeUsd),
    bump: p.bump,
    collateralAmount: fromBN(p.collateralUsd),
    collateralUsd: fromBN(p.collateralUsd),
    cumulativeInterestSnapshot: fromBN(p.cumulativeInterestSnapshot),
    custody: p.custody.toString() as Address,
    lockedAmount: fromBN(p.lockedAmount),
    openTime: new Date(p.openTime.toNumber() * 1000),
    owner: p.owner.toString() as Address,
    pool: p.pool.toString() as Address,
    price: fromBN(p.price),
    sizeUsd: fromBN(p.sizeUsd),
    unrealizedLossUsd: fromBN(p.unrealizedLossUsd),
    unrealizedProfitUsd: fromBN(p.unrealizedProfitUsd),
    updateTime: new Date(p.openTime.toNumber() * 1000),
  };
};
const parseCustody = (
  data: ProgramAccount<IdlAccounts<Perpetuals>["custody"]>,
) => {
  const c = data.account;
  return {
    address: data.publicKey.toString() as Address,
    bump: c.bump,
    decimals: c.decimals,
    mint: c.mint.toString() as Address,
    pool: c.pool.toString() as Address,
    tokenAccount: c.tokenAccount.toString() as Address,
    tokenAccountBump: c.tokenAccountBump.toString() as Address,
    assets: {
      collateral: fromBN(c.assets.collateral),
      locked: fromBN(c.assets.locked),
      owned: fromBN(c.assets.owned),
      protocolFees: fromBN(c.assets.protocolFees),
    },
    borrowRate: {
      baseRate: fromBN(c.borrowRate.baseRate),
      optimalUtilization: fromBN(c.borrowRate.optimalUtilization),
      slope1: fromBN(c.borrowRate.slope1),
      slope2: fromBN(c.borrowRate.slope2),
    },
    borrowRateState: {
      cumulativeInterest: fromBN(c.borrowRateState.cumulativeInterest),
      currentRate: fromBN(c.borrowRateState.currentRate),
      lastUpdate: new Date(c.borrowRateState.lastUpdate.toNumber() * 1000),
    },
    collectedFees: {
      addLiquidityUsd: fromBN(c.collectedFees.addLiquidityUsd),
      closePositionUsd: fromBN(c.collectedFees.closePositionUsd),
      liquidationUsd: fromBN(c.collectedFees.liquidationUsd),
      openPositionUsd: fromBN(c.collectedFees.openPositionUsd),
      removeLiquidityUsd: fromBN(c.collectedFees.removeLiquidityUsd),
    },
    fees: {
      addLiquidity: fromBN(c.fees.addLiquidity),
      closePosition: fromBN(c.fees.closePosition),
      liquidation: fromBN(c.fees.liquidation),
      openPosition: fromBN(c.fees.openPosition),
      protocolShare: fromBN(c.fees.protocolShare),
      removeLiquidity: fromBN(c.fees.removeLiquidity),
      utilizationMult: fromBN(c.fees.utilizationMult),
    },
    longPositions: {
      borrowSizeUsd: fromBN(c.longPositions.borrowSizeUsd),
      collateralUsd: fromBN(c.longPositions.collateralUsd),
      cumulativeInterestSnapshot: fromBN(
        c.longPositions.cumulativeInterestSnapshot,
      ),
      cumulativeInterestUsd: fromBN(c.longPositions.cumulativeInterestUsd),
      lockedAmount: fromBN(c.longPositions.lockedAmount),
      openPositions: fromBN(c.longPositions.openPositions),
      sizeUsd: fromBN(c.longPositions.sizeUsd),
      totalQuantity: fromBN(c.longPositions.totalQuantity),
      weightedPrice: fromBN(c.longPositions.weightedPrice),
    },
    oracle: {
      maxPriceAgeSec: c.oracle.maxPriceAgeSec,
      maxPriceError: fromBN(c.oracle.maxPriceError),
      oracleAccount: c.oracle.oracleAccount.toString() as Address,
      oracleAuthority: c.oracle.oracleAuthority.toString() as Address,
      oracleType: c.oracle.oracleType, // TODO: - Convert to "ENUM"
    },
    permissions: {
      allowAddLiquidity: c.permissions.allowAddLiquidity,
      allowClosePosition: c.permissions.allowClosePosition,
      allowCollateralWithdrawal: c.permissions.allowCollateralWithdrawal,
      allowOpenPosition: c.permissions.allowOpenPosition,
      allowPnlWithdrawal: c.permissions.allowPnlWithdrawal,
      allowRemoveLiquidity: c.permissions.allowRemoveLiquidity,
      allowSizeChange: c.permissions.allowSizeChange,
    },
    pricing: {
      maxInitialLeverage: fromBN(c.pricing.maxInitialLeverage),
      maxLeverage: fromBN(c.pricing.maxLeverage),
      maxPayoffMult: fromBN(c.pricing.maxPayoffMult),
      maxPositionLockedUsd: fromBN(c.pricing.maxPositionLockedUsd),
      maxTotalLockedUsd: fromBN(c.pricing.maxTotalLockedUsd),
      maxUtilization: fromBN(c.pricing.maxUtilization),
      minInitialLeverage: fromBN(c.pricing.minInitialLeverage),
      tradeSpreadLong: fromBN(c.pricing.tradeSpreadLong),
      tradeSpreadShort: fromBN(c.pricing.tradeSpreadShort),
      useEma: c.pricing.useEma,
      useUnrealizedPnlInAum: c.pricing.useUnrealizedPnlInAum,
    },
    tradeStats: {
      lossUsd: fromBN(c.tradeStats.lossUsd),
      oiLongUsd: fromBN(c.tradeStats.oiLongUsd),
      profitUsd: fromBN(c.tradeStats.profitUsd),
    },
    volumeStats: {
      addLiquidityUsd: fromBN(c.volumeStats.addLiquidityUsd),
      closePositionUsd: fromBN(c.volumeStats.closePositionUsd),
      liquidationUsd: fromBN(c.volumeStats.liquidationUsd),
      openPositionUsd: fromBN(c.volumeStats.openPositionUsd),
      removeLiquidityUsd: fromBN(c.volumeStats.removeLiquidityUsd),
    },
  };
};

type Position = ReturnType<typeof parsePosition>;
type Custody = ReturnType<typeof parseCustody>;
const findPerpetualsAddressSync = (
  program: Program<Perpetuals>,
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
    program.programId,
  )[0];

  return publicKey.toString() as Address;
};

export async function startInterval(callback: () => void, interval: number) {
  await callback();
  setIntervalAsync(callback, interval);
}

async function liquidate(
  program: Program<Perpetuals>,
  position: Position,
  custody: Custody,
) {
  // Send collateral to position owner
  const receivingAccount = getAssociatedTokenAddressSync(
    new PublicKey(custody.mint),
    new PublicKey(position.owner),
  );

  // Send the rewards to ourselves
  const rewardsReceivingAccount = getAssociatedTokenAddressSync(
    new PublicKey(custody.mint),
    program.provider.publicKey!,
  );

  return await program.methods
    .liquidate({})
    .preInstructions([
      createAssociatedTokenAccountIdempotentInstruction(
        program.provider.publicKey!,
        receivingAccount,
        new PublicKey(position.owner),
        new PublicKey(custody.mint),
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        program.provider.publicKey!,
        rewardsReceivingAccount,
        program.provider.publicKey!,
        new PublicKey(custody.mint),
      ),
    ])
    .accounts({
      signer: program.provider.publicKey,
      receivingAccount,
      rewardsReceivingAccount,
      transferAuthority: findPerpetualsAddressSync(
        program,
        "transfer_authority",
      ),
      perpetuals: findPerpetualsAddressSync(program, "perpetuals"),
      pool: position.pool,
      position: position.address,
      custody: position.custody,
      custodyOracleAccount: custody.oracle.oracleAccount,
      custodyTokenAccount: findPerpetualsAddressSync(
        program,
        "custody_token_account",
        position.pool,
        custody.mint,
      ),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

const loadWallet = () => {
  try {
    return new Wallet(
      Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY as string)),
      ),
    );
  } catch {
    throw new Error(
      "Private key not found. Please set the PRIVATE_KEY environment variable.",
    );
  }
};

async function main() {
  const programId = env.PERPETUALS_IDL_URL
    ? ((await getProgramIdFromUrl(env.PERPETUALS_IDL_URL)) ?? IDL.address)
    : IDL.address;

  // Pool IDL Endpoint to see if program address has changed
  if (env.PERPETUALS_IDL_URL) {
    startInterval(async () => {
      const address = await getProgramIdFromUrl(env.PERPETUALS_IDL_URL!);
      if (address && address.toString() !== programId.toString()) {
        console.log("Found new program address, restarting...");
        process.exit(0);
      }
    }, 60 * 1000);
  }

  // Ping healthcheck every minute if defined
  if (env.HEALTHCHECKS_URL !== undefined) {
    startInterval(() => {
      axios.get(env.HEALTHCHECKS_URL!);
    }, 60 * 1000);
  }

  const connection = new Connection(env.RPC_ENDPOINT, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });

  const wallet = loadWallet();
  const provider = new AnchorProvider(connection, wallet, {});
  const program = new Program<Perpetuals>(IDL as Perpetuals, provider);

  // https://solana.com/docs/core/clusters#devnet-rate-limits
  const limiter = new RateLimiter({
    tokensPerInterval: 40,
    interval: 10 * 1000,
  });

  // Assume custody oracle doesn't change, so cache forever
  const getCustody = memoize(async (custody: Address) => {
    await limiter.removeTokens(1);
    return await program.account.custody
      .fetch(new PublicKey(custody))
      .then((account) =>
        parseCustody({ publicKey: new PublicKey(custody), account }),
      );
  });

  notify(`Starting liquidator against ${programId.toString()}`);
  console.log(
    `Using RPC endpoint: ${env.RPC_ENDPOINT}\nUsing wallet: ${wallet.publicKey.toString()}`,
  );

  let positions: Position[] = [];

  // Start loop to fetch positions, awaiting for first fetch
  await startInterval(async () => {
    await limiter.removeTokens(1);
    positions = await program.account.position
      .all()
      .then((x) => x.map(parsePosition));
    console.log("Refreshed positions to track");
  }, 60 * 1000);

  // Continuously check positions and liquidate
  while (true) {
    const start = Date.now();
    let count = 0;

    // Loop backwards, so we can remove items from the array as we go along
    for (let i = positions.length - 1; i >= 0; i--) {
      const position = positions[i];
      const custody = await getCustody(position.custody);

      await limiter.removeTokens(1);
      const state = await program.methods
        .getLiquidationState({})
        .accounts({
          perpetuals: findPerpetualsAddressSync(program, "perpetuals"),
          pool: position.pool,
          position: position.address,
          custody: position.custody,
          custodyOracleAccount: custody.oracle.oracleAccount,
        })
        .view()
        .catch((error) => {
          if (
            error instanceof Error &&
            JSON.stringify(error).includes(
              "AccountNotInitialized. Error Number: 3012",
            )
          ) {
            // Position no longer exists, so stop checking
            positions.splice(i, 1);
            return 0; // Return 0 so we exit early below
          }

          throw error;
        });

      if (state === 0) {
        continue;
      }
      count += 1;

      notify(`Found position to liquidate: ${position.address}`);
      try {
        await limiter.removeTokens(1);
        const tx = await liquidate(program, position, custody)
        notify(`Liquidated position with tx: ${tx}`);
      } catch (error) {
        notify(
          `Failed to liquidate: ${position.address}. Check logs for more details`,
        );
        console.log(error);
      }
    }
    const delta = Date.now() - start;
    console.log(
      `Checked ${
        positions.length
      } positions and liquidated ${count} of them in ${delta / 1000}s`,
    );

    // Wait at least 1 second before looping again
    if (delta < 1000) {
      await sleep(1000 - delta);
    }
  }
}

main();
