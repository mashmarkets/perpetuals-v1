import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import { getPriceFeedAccountForProgram } from "@pythnetwork/pyth-solana-receiver";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import {
  BorrowRateParams,
  Fees,
  OracleParams,
  Permissions,
  PricingParams,
} from "../packages/cli/src/types.js";
import { sleep } from "../packages/liquidator/src/utils.js";
import { universe } from "../packages/ui/src/lib/universe.js";
import FaucetIDL from "../target/idl/faucet.json";
import IDL from "../target/idl/perpetuals.json";
import { Perpetuals } from "../target/types/perpetuals.js";

const { AnchorProvider, BN, Program, utils } = anchor;

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

const findPerpetualsAddressSync = (
  program: Program<Perpetuals>,
  ...seeds: Array<Buffer | string | PublicKey | Uint8Array>
) => {
  const publicKey = PublicKey.findProgramAddressSync(
    seeds.map((x) => {
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

  return publicKey;
};

export const findFaucetAddressSync = (...seeds) =>
  PublicKey.findProgramAddressSync(
    seeds.map((x) => {
      if (x instanceof PublicKey) {
        return x.toBuffer();
      }
      if (typeof x === "string") {
        return utils.bytes.utf8.encode(x);
      }
      if (typeof x === "number" || x instanceof BN) {
        return new BN(x.toString()).toArrayLike(Buffer, "le", 8);
      }
      return x;
    }),
    new PublicKey(FaucetIDL.address),
  )[0];

export const findFaucetMint = (canonical: string, epoch: bigint) =>
  findFaucetAddressSync(
    "mint",
    new PublicKey(canonical),
    new BN(epoch.toString()),
  );

interface CustodyParams {
  oracle: OracleParams;
  pricing: PricingParams;
  permissions: Permissions;
  fees: Fees;
  borrowRate: BorrowRateParams;
}

const getCustodyParam = (symbol: string): CustodyParams => {
  const token = tokens[symbol];
  const oracleAccount = getPriceFeedAccountForProgram(
    0,
    token.extensions.feedId,
  );

  // Where sponsored feeds commit to 0.02% deviation, we can offer higher leverage
  const maxInitialLeverage = ["SOL", "BTC", "WBTC", "JITOSOL", "BONK"].includes(
    symbol.toUpperCase(),
  )
    ? 10_000_000 // 1_000x
    : 1_000_000; // 100x

  const MAX_U64 = "18446744073709551615";
  return {
    oracle: {
      maxPriceError: new BN(2_000), // 20%
      maxPriceAgeSec: 130, // 130 seconds - Choosen by looking at devnet oracles
      oracleAccount,
      oracleType: { ["pyth"]: {} }, // None, custom, pyth
      oracleAuthority: PublicKey.default, // By default, permissionless oracle price update is not allowed. Pubkey allowed to sign permissionless off-chain price updates
    },
    // Figures are in BPS
    pricing: {
      useUnrealizedPnlInAum: true,
      tradeSpreadLong: new BN(0), // 0%
      tradeSpreadShort: new BN(0), // 0%
      minInitialLeverage: new BN(11_000), // 1.1
      maxInitialLeverage: new BN(maxInitialLeverage),
      maxLeverage: new BN(maxInitialLeverage * 2),
      maxPayoffMult: new BN(10_000), // 100%
      maxUtilization: new BN(9_000), // 90%
      maxPositionLockedUsd: new BN(1_000_000 * 10 ** 9), // 1M USD
      maxTotalLockedUsd: new BN(MAX_U64), // Cannot be "0" when max position locked is set
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
      utilizationMult: new BN(10000), // 100%
      addLiquidity: new BN(0), // 0%
      removeLiquidity: new BN(20), // 0.2%
      openPosition: new BN(0), // 0%
      closePosition: new BN(10), // 0.1%
      liquidation: new BN(0), // 0%
      protocolShare: new BN(2_000), // 20%
    },
    borrowRate: {
      baseRate: new BN(0),
      slope1: new BN(0), // 0.008%
      slope2: new BN(0),
      optimalUtilization: new BN(800_000_000), // 80%
    },
  };
};

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });

  const wallet = new Wallet(
    Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY as string)),
    ),
  );
  // Wallet is set via
  const provider = new AnchorProvider(connection, wallet, {});

  const perpetuals = new Program<Perpetuals>(IDL as Perpetuals, provider);

  // Create pools
  const pools = Object.values(tokens)
    .filter((x) => !x.symbol.startsWith("US"))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  for (let i = 0; i < pools.length; i++) {
    const token = pools[i];
    await sleep(1000); // Avoid 429
    console.log(`\n [${i} ${token.symbol}] Updating parameters`);

    const custodyParams = getCustodyParam(token.symbol);

    const pool = findPerpetualsAddressSync(
      perpetuals,
      "pool",
      token.symbol.toUpperCase(),
    );
    const mint = findFaucetMint(token.address, new BN(0));

    const custody = findPerpetualsAddressSync(
      perpetuals,
      "custody",
      pool,
      mint,
    );

    const tx = await perpetuals.methods
      .setCustodyConfig(custodyParams)
      .accounts({
        admin: perpetuals.provider.publicKey,
        multisig: findPerpetualsAddressSync(perpetuals, "multisig"),
        pool,
        custody,
      })
      .rpc()
      .catch((error) => {
        console.log(error);
        console.log("Failed to update custody config for ", token.symbol);
      });

    console.log(`Updated config for ${token.symbol} with: `, tx);
  }
}

main();
