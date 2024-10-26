import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getPriceFeedAccountForProgram } from "@pythnetwork/pyth-solana-receiver";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

import { PerpetualsClient } from "../packages/cli/src/client.js";
import {
  createFaucetProgram,
  findFaucetMint,
  mintCreate,
  oracleAdd,
} from "../packages/cli/src/faucet.js";
import {
  BorrowRateParams,
  Fees,
  OracleParams,
  Permissions,
  PricingParams,
} from "../packages/cli/src/types.js";

const epoch = BigInt(0);
interface Token {
  address: string;
  symbol: string;
  decimals: number;
  extensions: {
    coingeckoId: string;
    feedId: string;
    seed: BN;
  };
}
const tokens = [
  {
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "Bonk",
    decimals: 5,
    extensions: {
      coingeckoId: "bonk",
      feedId:
        "72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419",
      seed: BigInt(500_000_000 * 10 ** 5),
    },
  },
  {
    address: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    symbol: "JitoSOL",
    decimals: 9,
    extensions: {
      coingeckoId: "jito-staked-sol",
      feedId:
        "67be9f519b95cf24338801051f9a808eff0a578ccb388db73b7f6fe1de019ffb",
      seed: BigInt(60 * 10 ** 9),
    },
  },
  {
    address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    symbol: "WIF",
    decimals: 6,
    extensions: {
      coingeckoId: "dogwifcoin",
      feedId:
        "4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc",
      seed: BigInt(4_000 * 10 ** 6),
    },
  },
  {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    decimals: 6,
    extensions: {
      coingeckoId: "usd-coin",
      feedId:
        "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
      seed: BigInt(100_000_000 * 10 ** 6),
    },
  },
].reduce(
  (acc, curr) => {
    acc[curr.symbol] = curr;
    return acc;
  },
  {} as Record<string, Token>,
);

async function createPool(client: PerpetualsClient, token: Token) {
  const poolName = token.symbol;
  await client
    .addPool(poolName)
    .then((sig) => console.log(`Pool ${poolName} added: `, sig));

  const oracle = getPriceFeedAccountForProgram(0, token.extensions.feedId);
  const oracleConfig: OracleParams = {
    maxPriceError: new BN(10_000), //u64 Max Price
    maxPriceAgeSec: 600, // 10 minutes. Seems we are using some old pyth oracles that often go stale
    oracleType: { ["pyth"]: {} }, // None, custom, pyth
    oracleAccount: oracle,
    oracleAuthority: PublicKey.default, // By default, permissionless oracle price update is not allowed. Pubkey allowed to sign permissionless off-chain price updates
  };

  // Figures are in BPS
  const pricingConfig: PricingParams = {
    useEma: false, // Keep things simple for now
    useUnrealizedPnlInAum: true,
    tradeSpreadLong: new BN(10), // 0.1%
    tradeSpreadShort: new BN(10), // 0.1%
    minInitialLeverage: new BN(11_000), // 1.1x
    maxInitialLeverage: new BN(1_000_000), // 100x
    maxLeverage: new BN(5_000_000), // 500x
    maxPayoffMult: new BN(10_000), // 100%
    maxUtilization: new BN(10_000), // 100%
    maxPositionLockedUsd: new BN(0), // No limit
    maxTotalLockedUsd: new BN(0), // No limit
  };
  const permissions: Permissions = {
    allowAddLiquidity: true,
    allowRemoveLiquidity: true,
    allowOpenPosition: true,
    allowClosePosition: true,
    allowPnlWithdrawal: true,
    allowCollateralWithdrawal: true,
    allowSizeChange: true,
  };
  const fees: Fees = {
    utilizationMult: new BN(10_000), // 200%
    addLiquidity: new BN(0), // 0.1%
    removeLiquidity: new BN(50), // 0.1%
    openPosition: new BN(0), // 0.0%
    closePosition: new BN(0), // 0.0%
    liquidation: new BN(100), // 1%
    protocolShare: new BN(10), // 0.1%
  };

  const borrowRate: BorrowRateParams = {
    baseRate: new BN(0.005),
    slope1: new BN(80_000), // 0.008%
    slope2: new BN(120_000),
    optimalUtilization: new BN(800_000_000), // 80%
  };

  const mint = findFaucetMint(token.address, epoch);
  await client
    .addCustody(
      poolName,
      mint,
      oracleConfig,
      pricingConfig,
      permissions,
      fees,
      borrowRate,
    )
    .then((sig) => console.log(`Custody for ${poolName} added: `, sig));

  const payer = client.program.provider.publicKey!;

  const lpMint = client.getPoolLpTokenKey(poolName);
  await client
    .addLiquidity(
      poolName,
      mint,
      new BN(token.extensions.seed.toString()),
      new BN(0),
      [
        createAssociatedTokenAccountIdempotentInstruction(
          payer,
          getAssociatedTokenAddressSync(lpMint, payer),
          payer,
          lpMint,
        ),
      ],
    )
    .then((sig) => console.log(`Liquidity added for ${poolName}: `, sig));
}

async function main() {
  const KEY = process.env.PRIVATE_KEY;

  // Wallet is set via this env variable
  process.env.ANCHOR_WALLET = process.env.PRIVATE_KEY;
  const provider = AnchorProvider.local("https://api.devnet.solana.com", {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const faucet = createFaucetProgram(provider);
  const perpetuals = new PerpetualsClient("https://api.devnet.solana.com", KEY);

  // Initialize the protocol
  await perpetuals
    .init([perpetuals.program.provider.publicKey], {
      minSignatures: 1,
      allowAddLiquidity: true,
      allowRemoveLiquidity: true,
      allowOpenPosition: true,
      allowClosePosition: true,
      allowPnlWithdrawal: true,
      allowCollateralWithdrawal: true,
      allowSizeChange: true,
    })
    .then((sig) => console.log("Protocol initialized: ", sig));

  // Mint usdc to me
  await mintCreate(faucet, {
    canonical: tokens.USDC.address,
    epoch,
    decimals: tokens.USDC.decimals,
    amount: tokens.USDC.extensions.seed,
  }).then((sig) =>
    console.log(`Created mint for ${tokens.USDC.symbol} in faucet: ${sig}`),
  );

  // Create pools
  const pools = Object.values(tokens).filter((x) => x.symbol !== "USDC");
  for (const token of pools) {
    await oracleAdd(faucet, {
      canonical: token.address,
      maxPriceAgeSec: BigInt(600),
      feedId: token.extensions.feedId,
    }).then((sig) =>
      console.log(`Added oracle for ${token.symbol} to faucet: ${sig}`),
    );

    await mintCreate(faucet, {
      canonical: token.address,
      epoch,
      decimals: token.decimals,
      amount: token.extensions.seed,
    }).then((sig) =>
      console.log(`Created mint for ${token.symbol} in faucet: ${sig}`),
    );

    await createPool(perpetuals, token);
  }
}

main();
