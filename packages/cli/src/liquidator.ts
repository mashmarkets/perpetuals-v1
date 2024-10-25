import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { setIntervalAsync } from "set-interval-async/dynamic";
import { memoize } from "lodash-es";

import { IDL, Perpetuals } from "./target/types/perpetuals.js";
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

import PerpetualsJson from "./target/idl/perpetuals.json" assert { type: "json" };
console.log(PerpetualsJson.metadata.address);
const getAddressFromIdl = () => {
  const fileName = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "./target/idl/perpetuals.json"
  );

  const idl = JSON.parse(fs.readFileSync(fileName, "utf-8"));

  return idl.metadata.address;
};

const programId = new PublicKey(process.env.PROGRAM_ID ?? getAddressFromIdl());

const fromBN = (v: BN) => BigInt(v.toString());
const parsePosition = (
  data: ProgramAccount<IdlAccounts<Perpetuals>["position"]>
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
  data: ProgramAccount<IdlAccounts<Perpetuals>["custody"]>
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
        c.longPositions.cumulativeInterestSnapshot
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

const findPerpetualsAddressSync = (
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
    programId
  )[0];

  return publicKey.toString() as Address;
};

const perpetuals = findPerpetualsAddressSync("perpetuals");
export async function startInterval(callback: () => void, interval: number) {
  await callback();
  setIntervalAsync(callback, interval);
}

async function liquidate(
  program: Program<Perpetuals>,
  position: ReturnType<typeof parsePosition>,
  custody: ReturnType<typeof parseCustody>
) {
  // Send collateral to position owner
  const receivingAccount = getAssociatedTokenAddressSync(
    new PublicKey(custody.mint),
    new PublicKey(position.owner)
  );

  // Send the rewards to ourselves
  const rewardsReceivingAccount = getAssociatedTokenAddressSync(
    new PublicKey(custody.mint),
    program.provider.publicKey!
  );

  return await program.methods
    .liquidate({})
    .preInstructions([
      createAssociatedTokenAccountIdempotentInstruction(
        program.provider.publicKey!,
        receivingAccount,
        new PublicKey(position.owner),
        new PublicKey(custody.mint)
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        program.provider.publicKey!,
        rewardsReceivingAccount,
        program.provider.publicKey!,
        new PublicKey(custody.mint)
      ),
    ])
    .accounts({
      signer: program.provider.publicKey,
      receivingAccount,
      rewardsReceivingAccount,
      transferAuthority: this.authority.publicKey,
      perpetuals,
      pool: position.pool,
      position: position.address,
      custody: position.custody,
      custodyOracleAccount: custody.oracle.oracleAccount,
      custodyTokenAccount: findPerpetualsAddressSync(
        "custody_token_account",
        position.pool,
        custody.mint
      ),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}
async function main() {
  // Setup
  const INTERVAL = process.env.INTERVAL
    ? parseInt(process.env.INTERVAL)
    : 30_000;
  const RPC_ENDPOINT =
    process.env.RPC_ENDPOINT ?? "https://api.devnet.solana.com";
  const connection = new Connection(RPC_ENDPOINT);

  const wallet = new Wallet(
    Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY as string))
    )
  );
  const provider = new AnchorProvider(connection, wallet, {});
  const program = new Program<Perpetuals>(IDL, programId, provider);

  console.log(
    `Running liquidator against ${programId.toString()}\nUsing RPC endpoint: ${RPC_ENDPOINT}\nUsing wallet: ${wallet.publicKey.toString()}`
  );

  const getCustody = memoize((custody: Address) =>
    program.account.custody
      .fetch(new PublicKey(custody))
      .then((account) =>
        parseCustody({ publicKey: new PublicKey(custody), account })
      )
  );

  startInterval(async () => {
    const start = Date.now();
    let count = 0;
    // Get all positions
    const positions = await program.account.position
      .all()
      .then((x) => x.map(parsePosition));

    for (const position of positions) {
      const custody = await getCustody(position.custody);

      const state = await program.methods
        .getLiquidationState({})
        .accounts({
          perpetuals,
          pool: position.pool,
          position: position.address,
          custody: position.custody,
          custodyOracleAccount: custody.oracle.oracleAccount,
        })
        .view();

      if (state === 0) {
        continue;
      }
      count += 1;

      console.log(`Found position to liquidate: ${position.address}`);
      try {
        const tx = await liquidate(program, position, custody).catch(() => {});
        console.log(`Liquidated position with tx: ${tx}`);
      } catch (error) {
        console.log(`Failed to liquidate: ${position.address}`, error);
      }
    }
    console.log(
      `Checked ${
        positions.length
      } positions and liquidated ${count} of them in ${
        (Date.now() - start) / 1000
      }s`
    );
  }, INTERVAL);
}

main();
