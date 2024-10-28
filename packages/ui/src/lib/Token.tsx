import { Address } from "@solana/addresses";
import { memoize } from "lodash-es";

import { getFaucetMint } from "@/actions/faucet";

import { universe } from "./universe";

interface Token {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  extensions: {
    coingeckoId: string;
    canonical: Address;
    oracle: Address;
    feedId: string;
  };
}

export const EPOCH = BigInt(0);
// Asset for our credits
export const USDC_MINT = getFaucetMint(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as Address,
);

// Remap mainnet address to testnet faucet address
const tokenList: Token[] = universe.map(
  (x) =>
    ({
      ...x,
      extensions: {
        ...x.extensions,
        canonical: x.address,
      },
      // Note: For simulation trading we also mock WSOL. Otherwise we should leave native mint intact
      address: getFaucetMint(x.address as Address).toString() as Address,
    }) as Token,
);

export const getTokensKeyedBy = memoize(
  (k: keyof Omit<Token, "extensions">) => {
    return tokenList.reduce(
      (acc, curr) => {
        acc[curr[k]] = curr;
        return acc;
      },
      {} as Record<string, Token>,
    );
  },
);

export const tokensByMint = getTokensKeyedBy("address");

export const getTokenInfo = (mint: Address) => tokensByMint[mint]!;

export const TRADEABLE_MINTS = Object.values(tokensByMint)
  .filter((x) => !["USDC", "USDT"].includes(x.symbol))
  .sort((a, b) => a.symbol.localeCompare(b.symbol))
  .map((x) => x.address) as Address[];

export function getTokenLabel(mint: Address | undefined) {
  if (
    mint === undefined ||
    !Object.prototype.hasOwnProperty.call(tokensByMint, mint.toString())
  ) {
    return "Unknown";
  }

  return tokensByMint[mint]!.name;
}

export function getTokenSymbol(mint: Address | undefined) {
  if (
    mint === undefined ||
    !Object.prototype.hasOwnProperty.call(tokensByMint, mint.toString())
  ) {
    return "???";
  }

  return tokensByMint[mint]!.symbol;
}

export function getTokenIcon(mint: Address | undefined) {
  if (
    mint === undefined ||
    !Object.prototype.hasOwnProperty.call(tokensByMint, mint.toString())
  ) {
    return <></>;
  }
  const src = tokensByMint[mint]!.logoURI;
  const alt = tokensByMint[mint]!.name;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Don't want to be reliant on vercel deployment for now
    <img src={src} alt={alt} width={20} height={20} className="rounded-full" />
  );
}

export function getCoingeckoId(mint: Address) {
  if (!Object.prototype.hasOwnProperty.call(tokensByMint, mint.toString())) {
    return undefined;
  }

  return tokensByMint[mint.toString()]!.extensions.coingeckoId;
}

export function getTradingViewSymbol(mint: Address) {
  const { symbol } = getTokenInfo(mint);
  return `PYTH:${symbol}USD`;
}
