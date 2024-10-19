import { PublicKey } from "@solana/web3.js";
import { memoize } from "lodash-es";

import { getFaucetMint } from "@/actions/faucet";

import { universe } from "./universe";

interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  extensions: {
    coingeckoId: string;
    mainnet: string;
    oracle: string;
  };
}
export const tokenList: Token[] = universe.map((x) => ({
  ...x,
  extensions: {
    ...x.extensions,
    mainnet: x.address,
  },
  address:
    x.address === "So11111111111111111111111111111111111111112"
      ? "So11111111111111111111111111111111111111112"
      : getFaucetMint(new PublicKey(x.address)).toString(),
}));

export const getTokenList = () => tokenList;
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

export const tokens = getTokensKeyedBy("address");
export const getTokenInfo = (mint: PublicKey) => tokens[mint.toString()]!;

// This MUST match UPPER token symbol for now
export enum TokenE {
  BLZE = "BLZE",
  Bonk = "Bonk",
  bSOL = "bSOL",
  BTC = "BTC",
  ETH = "ETH",
  FIDA = "FIDA",
  GOFX = "GOFX",
  HNT = "HNT",
  INF = "INF",
  IOT = "IOT",
  JitoSOL = "JitoSOL",
  JLP = "JLP",
  JTO = "JTO",
  JUP = "JUP",
  KMNO = "KMNO",
  LST = "LST",
  MEW = "MEW",
  MNDE = "MNDE",
  MOBILE = "MOBILE",
  mSOL = "mSOL",
  NEON = "NEON",
  ORCA = "ORCA",
  PRCL = "PRCL",
  PYTH = "PYTH",
  RAY = "RAY",
  RENDER = "RENDER",
  SAMO = "SAMO",
  SLND = "SLND",
  SOL = "SOL",
  TNSR = "TNSR",
  USDC = "USDC",
  USDT = "USDT",
  W = "W",
  WBTC = "WBTC",
  WEN = "WEN",
  WIF = "WIF",
}
export const TOKEN_LIST = Object.values(TokenE);

export const TOKEN_ADDRESSES = tokenList.map((x) => new PublicKey(x.address));

export function asToken(tokenStr: string | PublicKey): TokenE {
  if (tokenStr instanceof PublicKey) {
    if (tokens[tokenStr.toString()] === undefined) {
      return TokenE.SOL;
    }
    return tokens[tokenStr.toString()]!.symbol as TokenE;
  }
  if (tokenStr === undefined) {
    return TokenE.SOL;
  }
  const token = TOKEN_LIST.find(
    (x) => x.toString().toUpperCase() === tokenStr.toUpperCase(),
  );

  if (token === undefined) {
    console.log("Cannot find token for: ", tokenStr);
    throw new Error("Not a valid token string");
  }
  return token;
}

export function getTokenLabel(token: PublicKey | undefined) {
  if (
    token === undefined ||
    !Object.prototype.hasOwnProperty.call(tokens, token.toString())
  ) {
    return "Unknown";
  }

  return tokens[token.toString()]!.name;
}

export function getTokenSymbol(token: PublicKey | undefined) {
  if (
    token === undefined ||
    !Object.prototype.hasOwnProperty.call(tokens, token.toString())
  ) {
    return "???";
  }

  return tokens[token.toString()]!.symbol;
}

export function getTokenIcon(token: PublicKey | undefined) {
  if (
    token === undefined ||
    !Object.prototype.hasOwnProperty.call(tokens, token.toString())
  ) {
    return <></>;
  }
  const src = tokens[token.toString()]!.logoURI;
  const alt = tokens[token.toString()]!.name;

  return (
    <img src={src} alt={alt} width={20} height={20} className="rounded-full" />
  );
}

export function getCoingeckoId(token: PublicKey) {
  if (!Object.prototype.hasOwnProperty.call(tokens, token.toString())) {
    return undefined;
  }

  return tokens[token.toString()]!.extensions.coingeckoId;
}

export function getTradingViewSymbol(mint: PublicKey) {
  const { symbol } = getTokenInfo(mint);
  return `PYTH:${symbol}USD`;
}

// Trying to decprecated TokenE and just use PublicKey
export function tokenAddressToToken(address: string): TokenE | null {
  if (!Object.prototype.hasOwnProperty.call(tokens, address)) {
    return null;
  }
  return tokens[address]!.symbol as TokenE;
}

// Trying to decprecated TokenE and just use PublicKey
export function getTokenPublicKey(token: TokenE) {
  if (token === undefined) {
    return PublicKey.default;
  }
  const info = tokenList.find(
    (x) => x.symbol.toUpperCase() === token.toUpperCase(),
  );

  if (info === undefined) {
    console.log("Can't find address for: ", token);
  }
  return new PublicKey(info!.address);
}
