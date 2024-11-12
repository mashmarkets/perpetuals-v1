import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import axios from "axios";

import { PerpetualsClient } from "../packages/cli/src/client.js";
import {
  createFaucetProgram,
  findFaucetMint,
  mintCreate,
  oracleAdd,
} from "../packages/cli/src/faucet.js";
import { sleep } from "../packages/liquidator/src/utils.js";
import { universe } from "../packages/ui/src/lib/universe.js";
import { getCustodyParam, tradeableTokens } from "./config.js";

const epoch = BigInt(0);

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

const getInitialSeedUsd = (s: string) => {
  const symbol = s.toUpperCase();
  if (symbol === "GOFX" || symbol === "SAMO") {
    return 5_000_000;
  }

  return 100_000_000;
};
async function main() {
  const KEY = process.env.PRIVATE_KEY;

  // Wallet is set via this env variable
  process.env.ANCHOR_WALLET = process.env.PRIVATE_KEY;
  const provider = AnchorProvider.local("https://api.devnet.solana.com", {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const faucet = createFaucetProgram(provider);
  const perpetuals = new PerpetualsClient(
    "https://api.devnet.solana.com",
    KEY!,
  );

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
    .then((sig) => console.log("Protocol initialized: ", sig))
    .catch((err) => {
      console.log(err);
      console.log("Failed to initialize protocol. Is is already initialized?");
    });

  const prices = await getPrices();

  for (let i = 0; i < tradeableTokens.length; i++) {
    // for (let i of [23]) {
    const token = tradeableTokens[i];
    await sleep(1000); // Avoid 429
    console.log(`\n[${i} ${token.symbol}] Setting up trading`);

    const poolName = token.symbol.toUpperCase();
    const mint = findFaucetMint(token.address, epoch);
    const custodyParams = getCustodyParam(token.symbol);
    const payer = perpetuals.program.provider.publicKey!;
    const lpMint = perpetuals.getPoolLpTokenKey(poolName);
    const usd = getInitialSeedUsd(token.symbol);

    const amount = BigInt(
      roundToOneSignificantFigure(
        (usd * 10 ** token.decimals) / prices[token.address],
      ),
    );

    if (amount > BigInt("18446744073709551615")) {
      console.log(`  Trying to create more than supply`);
      continue;
    }

    await oracleAdd(faucet, {
      canonical: token.address,
      maxPriceAgeSec: BigInt(600),
      feedId: token.extensions.feedId,
    }).then((sig) =>
      console.log(`  Added oracle for ${token.symbol} to faucet: ${sig}`),
    );

    await mintCreate(faucet, {
      canonical: token.address,
      epoch,
      decimals: token.decimals,
      amount,
    }).then((sig) =>
      console.log(`  Created mint for ${token.symbol} in faucet: ${sig}`),
    );

    await perpetuals
      .addPool(poolName)
      .then((sig) => console.log(`  Pool ${poolName} added: `, sig));

    await perpetuals
      .addCustody(
        poolName,
        mint,
        custodyParams.oracle,
        custodyParams.pricing,
        custodyParams.permissions,
        custodyParams.fees,
        custodyParams.borrowRate,
      )
      .then((sig) => console.log(`  Custody for ${poolName} added: `, sig));

    await perpetuals
      .addLiquidity(poolName, mint, new BN(amount.toString()), new BN(0), [
        createAssociatedTokenAccountIdempotentInstruction(
          payer,
          getAssociatedTokenAddressSync(lpMint, payer),
          payer,
          lpMint,
        ),
      ])
      .then((sig) => console.log(`  Liquidity added for ${poolName}: `, sig));
  }
}

main();
