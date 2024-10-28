import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getPriceFeedAccountForProgram } from "@pythnetwork/pyth-solana-receiver";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import axios from "axios";

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
import { universe } from "../packages/ui/src/lib/universe";

const epoch = BigInt(0);
interface Token {
  address: string;
  symbol: string;
  decimals: number;
  extensions: {
    coingeckoId: string;
    feedId: string;
  };
}
const tokens = universe.reduce(
  (acc, curr) => {
    acc[curr.symbol] = curr;
    return acc;
  },
  {} as Record<string, Token>,
);

function roundToOneSignificantFigure(num: number): number {
  if (num === 0) return 0; // Handle the case for 0 separately

  // Determine the factor by which to multiply to shift the decimal point to the right
  const exponent = Math.floor(Math.log10(Math.abs(num)));

  // Calculate the rounding factor
  const factor = Math.pow(10, exponent);

  // Use Math.ceil to round up and then scale back down by the factor
  return Math.ceil(num / factor) * factor;
}
const getPrices = async () => {
  const ids = universe.map((t) => t.extensions.coingeckoId).join(",");
  const { data } = await axios.get<
    Record<string, { usd: number; usd_24_vol: number; usd_24h_change: number }>
  >(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=USD&include_24hr_vol=true&include_24hr_change=true`,
  );

  return universe.reduce(
    (acc, t) => {
      const d = data[t.extensions.coingeckoId!];
      acc[t.address] = d?.usd;
      return acc;
    },
    {} as Record<string, number>,
  );
};

async function createPool(
  client: PerpetualsClient,
  token: Token,
  amount: BigInt,
) {
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
    .addLiquidity(poolName, mint, new BN(amount.toString()), new BN(0), [
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        getAssociatedTokenAddressSync(lpMint, payer),
        payer,
        lpMint,
      ),
    ])
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

  const USDC = Object.values(tokens).find((x) => x.symbol === "USDC")!;
  // Mint usdc to me
  await mintCreate(faucet, {
    canonical: USDC.address,
    epoch,
    decimals: USDC.decimals,
    amount: BigInt(1_000_000_000 * 10 ** 6),
  }).then((sig) =>
    console.log(`Created mint for ${tokens.USDC.symbol} in faucet: ${sig}`),
  );

  const prices = await getPrices();
  // Create pools
  const pools = Object.values(tokens)
    .filter((x) => !["USDC", "USDT"].includes(x.symbol))
    .sort((a, b) => a.address.localeCompare(b.address));

  for (const token of pools) {
    console.log(`\n [${token.symbol}] Setting up trading`);
    const amount = BigInt(
      roundToOneSignificantFigure(
        (5_000_000 * 10 ** token.decimals) / prices[token.address],
      ),
    );

    // console.log(`[${token.symbol}] Price ${prices[token.address]}`);
    if (amount > BigInt("18446744073709551615")) {
      console.log(`[${token.symbol}] Trying to create more than supply`);
      continue;
    }

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
      amount,
    }).then((sig) =>
      console.log(`Created mint for ${token.symbol} in faucet: ${sig}`),
    );

    await createPool(perpetuals, token, amount);
  }
}

main();
