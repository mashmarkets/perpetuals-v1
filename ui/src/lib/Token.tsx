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
    mainnet: Address;
    oracle: Address;
  };
}

// Remap mainnet address to testnet faucet address
const tokenList: Token[] = universe.map(
  (x) =>
    ({
      ...x,
      extensions: {
        ...x.extensions,
        mainnet: x.address,
      },
      address: (x.address === "So11111111111111111111111111111111111111112"
        ? "So11111111111111111111111111111111111111112"
        : getFaucetMint(x.address as Address).toString()) as Address,
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

export const TOKEN_LIST = Object.keys(tokensByMint) as Address[];

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
