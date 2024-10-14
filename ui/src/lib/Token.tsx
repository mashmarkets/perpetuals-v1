import { PublicKey } from "@solana/web3.js";

interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  extensions: {
    coingeckoId: string;
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
    },
  },
].map((x) => ({
  ...x,
  address: {
    DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263:
      "Ek9RtoqksVzPfMRFN2BTgCxM7e5QoJ3rZLL18phtz2Ri",
    orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE:
      "A5sPEFgEF2ET1Xdo6ZT8vMxwKqdBgQ6bAUaKdqoNApo8",
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R":
      "GFz5gtptPcqJpV5dUHqiwtDwvrVamjQyKaLaFrQ9iwH2",
    So11111111111111111111111111111111111111112:
      "So11111111111111111111111111111111111111112",
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v:
      "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
  }[x.address]!,
}));

const tokens = tokenList.reduce(
  (acc, curr) => {
    acc[curr.address] = curr;
    return acc;
  },
  {} as Record<string, Token>,
);

export enum TokenE {
  Bonk = "Bonk",
  ORCA = "ORCA",
  RAY = "RAY",
  SOL = "SOL",
  USDC = "USDC",
}
export const TOKEN_LIST = [
  TokenE.SOL,
  TokenE.USDC,
  TokenE.RAY,
  TokenE.ORCA,
  TokenE.Bonk,
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

export function getTokenIcon(token: PublicKey) {
  if (!Object.prototype.hasOwnProperty.call(tokens, token.toString())) {
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
  }
}

// Trying to decprecated TokenE and just use PublicKey
export function tokenAddressToToken(address: string): TokenE | null {
  switch (address) {
    case "So11111111111111111111111111111111111111112":
      return TokenE.SOL;
    case "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr":
      return TokenE.USDC;
    case "GFz5gtptPcqJpV5dUHqiwtDwvrVamjQyKaLaFrQ9iwH2":
      return TokenE.RAY;
    case "A5sPEFgEF2ET1Xdo6ZT8vMxwKqdBgQ6bAUaKdqoNApo8":
      return TokenE.ORCA;
    case "Ek9RtoqksVzPfMRFN2BTgCxM7e5QoJ3rZLL18phtz2Ri":
      return TokenE.Bonk;
    default:
      return null;
  }
}

// Trying to decprecated TokenE and just use PublicKey
export function getTokenPublicKey(token: TokenE) {
  function getTokenAddress(token: TokenE) {
    switch (token) {
      case TokenE.SOL:
        return "So11111111111111111111111111111111111111112";
      case TokenE.USDC:
        return "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";
      case TokenE.RAY:
        return "GFz5gtptPcqJpV5dUHqiwtDwvrVamjQyKaLaFrQ9iwH2";
      case TokenE.ORCA:
        return "A5sPEFgEF2ET1Xdo6ZT8vMxwKqdBgQ6bAUaKdqoNApo8";
      case TokenE.Bonk:
        return "Ek9RtoqksVzPfMRFN2BTgCxM7e5QoJ3rZLL18phtz2Ri";
    }
  }

  return new PublicKey(getTokenAddress(token));
}
