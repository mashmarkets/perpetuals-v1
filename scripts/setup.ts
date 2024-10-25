import { BN } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

import { PerpetualsClient } from "../packages/cli/src/client.js";
import { createMintToInstruction } from "../packages/cli/src/faucet.js";
import {
  BorrowRateParams,
  Fees,
  OracleParams,
  Permissions,
  PricingParams,
} from "../packages/cli/src/types.js";

interface PoolConfig {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  extensions: {
    coingeckoId: string;
    oracle: string;
    seed: BN;
    mainnet: string;
  };
}
const pools = [
  {
    address: "D4FMVb7xQDFWUvReycZEHJyU2RNiwyJTeZUcgiCTMdub",
    name: "Bonk",
    symbol: "Bonk",
    decimals: 5,
    logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
    extensions: {
      coingeckoId: "bonk",
      mainnet: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      oracle: "DBE3N8uNjhKPRHfANdwGvCZghWXyLPdqdSbEW2XFwBiX",
      seed: new BN(500_000_000 * 10 ** 5),
    },
  },
  {
    address: "8xtbXnx6bqWqsJh1mW4UNv9TgeTT6xmtNezyxkgKFiSe",
    name: "Jito Staked SOL",
    symbol: "JitoSOL",
    decimals: 9,
    logoURI: "https://storage.googleapis.com/token-metadata/JitoSOL-256.png",
    extensions: {
      coingeckoId: "jito-staked-sol",
      mainnet: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      oracle: "AxaxyeDT8JnWERSaTKvFXvPKkEdxnamKSqpWbsSjYg1g",
      seed: new BN(60 * 10 ** 9),
    },
  },
  {
    address: "GJLgAsg2MvgE4V9S9KgJKyEzENjxzh5vFfLKb7bxPk5L",
    name: "dogwifhat",
    symbol: "WIF",
    decimals: 6,
    logoURI:
      "https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link",
    extensions: {
      coingeckoId: "dogwifcoin",
      mainnet: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
      oracle: "6B23K3tkb51vLZA14jcEQVCA1pfHptzEHFA93V5dYwbT",
      seed: new BN(4_000 * 10 ** 6),
    },
  },
  {
    address: "A5ADsUcZB56UJpRXwKU2fskyB7jmEFYBSUXyL6WjbWgG",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logoURI:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    extensions: {
      mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      coingeckoId: "usd-coin",
      oracle: "Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX",
      seed: new BN(10_000 * 10 ** 6),
    },
  },
].reduce(
  (acc, curr) => {
    acc[curr.symbol] = curr;
    return acc;
  },
  {} as Record<string, PoolConfig>,
);

async function createPool(client: PerpetualsClient, config: PoolConfig) {
  const poolName = config.symbol;
  await client
    .addPool(poolName)
    .then((sig) => console.log(`Pool ${poolName} added: `, sig));

  const oracleConfig: OracleParams = {
    maxPriceError: new BN(10_000), //u64 Max Price
    maxPriceAgeSec: 600, // 10 minutes. Seems we are using some old pyth oracles that often go stale
    oracleType: { ["pyth"]: {} }, // None, custom, pyth
    oracleAccount: new PublicKey(config.extensions.oracle),
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

  const mint = new PublicKey(config.address);
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
    .addLiquidity(poolName, mint, config.extensions.seed, new BN(0), [
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        getAssociatedTokenAddressSync(lpMint, payer),
        payer,
        lpMint,
      ),
      await createMintToInstruction({
        payer,
        seed: new PublicKey(config.extensions.mainnet),
        amount: config.extensions.seed,
      }),
    ])
    .then((sig) => console.log(`Liquidity added for ${poolName}: `, sig));
}

async function main() {
  const KEY = process.env.PRIVATE_KEY;
  process.env.ANCHOR_WALLET = KEY;
  const client = new PerpetualsClient("https://api.devnet.solana.com", KEY);

  // Initialize the protocol
  await client
    .init([client.program.provider.publicKey], {
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

  await createPool(client, pools["JitoSOL"]);
  await createPool(client, pools["WIF"]);
  await createPool(client, pools["Bonk"]);
}

main();
