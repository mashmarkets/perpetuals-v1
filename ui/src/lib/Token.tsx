import { PublicKey } from "@solana/web3.js";
import { getFaucetMint } from "src/actions/faucet";

interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  extensions: {
    coingeckoId: string;
    mainnet: string;
    faucet: number;
  };
}
export const tokenList: Token[] = [
  {
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    name: "Bonk",
    symbol: "Bonk",
    decimals: 5,
    logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
    extensions: {
      coingeckoId: "bonk",
      faucet: 100_000_000,
    },
  },
  {
    address: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    name: "Orca",
    symbol: "ORCA",
    decimals: 6,
    logoURI:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png",
    extensions: {
      coingeckoId: "orca",
      faucet: 1000,
    },
  },
  {
    address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    name: "Raydium",
    symbol: "RAY",
    decimals: 6,
    logoURI:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png",
    extensions: {
      coingeckoId: "raydium",
      faucet: 1000,
    },
  },
  {
    address: "So11111111111111111111111111111111111111112",
    name: "Wrapped SOL",
    symbol: "SOL",
    decimals: 9,
    logoURI:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    extensions: {
      coingeckoId: "wrapped-solana",
      faucet: 1,
    },
  },
  {
    address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    name: "Marinade staked SOL (mSOL)",
    symbol: "mSOL",
    decimals: 9,
    logoURI:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png",
    extensions: {
      coingeckoId: "msol",
      faucet: 1,
    },
  },
  {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logoURI:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    extensions: {
      coingeckoId: "usd-coin",
      faucet: 1000,
    },
  },
].map((x) => ({
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

export const tokens = tokenList.reduce(
  (acc, curr) => {
    acc[curr.address] = curr;
    return acc;
  },
  {} as Record<string, Token>,
);

// This MUST match token symbol for now
export enum TokenE {
  Bonk = "Bonk",
  ORCA = "ORCA",
  RAY = "RAY",
  SOL = "SOL",
  USDC = "USDC",
  mSOL = "mSOL",
}
export const TOKEN_LIST = [
  TokenE.SOL,
  TokenE.USDC,
  TokenE.RAY,
  TokenE.ORCA,
  TokenE.Bonk,
  TokenE.mSOL,
];
export const TOKEN_ADDRESSES = tokenList.map((x) => new PublicKey(x.address));

export function asToken(tokenStr: string): TokenE {
  switch (tokenStr) {
    case "SOL":
      return TokenE.SOL;
    case "USDC":
      return TokenE.USDC;
    case "RAY":
      return TokenE.RAY;
    case "ORCA":
      return TokenE.ORCA;
    case "Bonk":
      return TokenE.Bonk;
    case "mSOL":
      return TokenE.mSOL;
    default:
      throw new Error("Not a valid token string");
  }
}

export function getTokenLabel(token: PublicKey) {
  if (!Object.prototype.hasOwnProperty.call(tokens, token.toString())) {
    return "Unknown";
  }

  return tokens[token.toString()]!.name;
}

export function getTokenSymbol(token: PublicKey) {
  if (!Object.prototype.hasOwnProperty.call(tokens, token.toString())) {
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

export function getTradingViewSymbol(token: TokenE) {
  switch (token) {
    case TokenE.Bonk:
      return "BONKUSDT";
    case TokenE.ORCA:
      return "ORCAUSD";
    case TokenE.RAY:
      return "RAYUSD";
    case TokenE.SOL:
      return "SOLUSD";
    case TokenE.USDC:
      return "USDCUSD";
    case TokenE.mSOL:
      return "mSOLUSD";
  }
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
  function getTokenAddress(token: TokenE) {
    return tokenList.find((x) => x.symbol === token)!.address;
  }

  return new PublicKey(getTokenAddress(token));
}
