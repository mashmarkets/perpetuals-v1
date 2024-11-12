import { Address } from "@solana/addresses";
import { memoize } from "lodash-es";

import { getFaucetMint } from "@/actions/faucet";

import { universe } from "./universe";

export const isValidSymbol = (symbol: unknown): boolean => {
  if (typeof symbol !== "string") {
    return false;
  }
  return universe.some((x) => x.symbol.toUpperCase() === symbol.toUpperCase());
};

interface Token {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  extensions: {
    tradingView: string;
    coingeckoId: string;
    canonical: Address;
    oracle: Address;
    feedId: string;
  };
}

const min = 20;
const delta = min * 60 * 1000;

const getEpoch = () => {
  const epoch = new Date();
  let minutes = epoch.getUTCMinutes();
  minutes = minutes - (minutes % min);
  epoch.setMinutes(minutes, 0, 0);
  return new Date(epoch.getTime() + delta);
};

export const getPreviousEpoch = (epoch: Date): Date | undefined => {
  return new Date(epoch.getTime() - delta);
};

export const getCurrentEpoch = () => {
  const epoch = getEpoch();
  const previous = getPreviousEpoch(new Date(epoch))!;

  // If its been expired for less than 60 returns, then return the previous epoch
  if (Date.now() - previous.getTime() < 60 * 1000) {
    return previous;
  }

  return epoch;
};

export const getNextEpoch = (epoch: Date): Date | undefined => {
  if (epoch.getTime() > Date.now()) {
    return undefined;
  }
  return new Date(epoch.getTime() + delta);
};

// Asset for our credits
export const getCompetitionMint = (epoch: Date) =>
  getFaucetMint(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as Address,
    epoch,
  );

const SOL = universe.find((x) => x.symbol === "SOL")!;

// Remap mainnet address to testnet faucet address
export const getTokenList = (epoch: Date) => {
  return [
    // Add unmocked WSOL so we can use it in the buyin process
    {
      ...SOL,
      extensions: {
        ...SOL.extensions,
        canonical: SOL.address as Address,
      },
    } as Token,
    ...universe.map(
      (x) =>
        ({
          ...x,
          extensions: {
            ...x.extensions,
            canonical: x.address,
            tradingView: `PYTH:${x.symbol}USD`,
          },
          // Note: For simulation trading we also mock WSOL. Otherwise we should leave native mint intact
          address: getFaucetMint(
            x.address as Address,
            x.address === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
              ? epoch
              : new Date(0),
          ).toString() as Address,
        }) as Token,
    ),
  ];
};

const getTokensByMint = memoize((epoch: Date) => {
  return getTokenList(epoch).reduce(
    (acc, curr) => {
      acc[curr.address] = curr;
      return acc;
    },
    {} as Record<string, Token>,
  );
});

export const getTokenInfo = (mint: Address | undefined, epoch: Date) => {
  // console.log({ mint, epoch });
  return getTokensByMint(epoch)[mint!];
};
