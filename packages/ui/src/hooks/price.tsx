import { Address } from "@solana/addresses";
import { useQueries, useQuery } from "@tanstack/react-query";
import { create, indexedResolver, windowScheduler } from "@yornaath/batshit";

import { queryClient } from "@/utils/queryClient";

import { useGetTokenInfo } from "./token";

export interface PriceStat {
  change24hr: number;
  currentPrice: number;
  high24hr: number;
  low24hr: number;
}

const coingeckoBatcher = create({
  name: "coingecko",
  fetcher: async (ids: string[]) => {
    return fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=USD&include_24hr_vol=true&include_24hr_change=true`,
    )
      .then((resp) => resp.json())
      .then(
        (
          data: Record<
            string,
            { usd: number; usd_24_vol: number; usd_24h_change: number }
          >,
        ) =>
          ids.reduce(
            (acc, id) => {
              // Force USDC to be $1Dollar
              if (id === "usd-coin") {
                acc[id] = {
                  change24hr: 0,
                  currentPrice: 1.0,
                  high24hr: 0,
                  low24hr: 0,
                };
                return acc;
              }
              const d = data[id];
              acc[id] = {
                change24hr: d?.usd_24h_change ?? 0,
                currentPrice: d?.usd ?? 0,
                high24hr: 0,
                low24hr: 0,
              };
              return acc;
            },
            {} as Record<string, PriceStat>,
          ),
      );
  },
  resolver: indexedResolver(),
  scheduler: windowScheduler(10),
});

const ONE_MINUTE = 60 * 1000;

queryClient.setQueryDefaults(["price"], {
  refetchInterval: ONE_MINUTE, // 1 MINUTE
});

export const usePrice = (mint: Address | undefined) => {
  const { getTokenInfo } = useGetTokenInfo();
  const coingeckoId = getTokenInfo(mint!)?.extensions.coingeckoId;

  return useQuery<PriceStat>({
    queryKey: ["coingecko", coingeckoId],
    enabled: !!mint && coingeckoId !== undefined,
    queryFn: () => coingeckoBatcher.fetch(coingeckoId!) as Promise<PriceStat>,
    staleTime: 5 * ONE_MINUTE,
  });
};

export const usePrices = (mints: Address[]) => {
  const { getTokenInfo } = useGetTokenInfo();
  return useQueries({
    queries: mints.map((mint) => {
      const coingeckoId = getTokenInfo(mint!)?.extensions.coingeckoId;
      return {
        queryKey: ["price", coingeckoId],
        enabled: coingeckoId !== undefined,
        queryFn: () =>
          coingeckoBatcher.fetch(coingeckoId!) as Promise<PriceStat>,
        staleTime: 60 * 1000,
      };
    }),
    combine: (results) => {
      return results.reduce(
        (acc, v, i) => {
          acc[mints[i]!.toString()] = v.data!;
          return acc;
        },
        {} as Record<string, PriceStat>,
      );
    },
  });
};
