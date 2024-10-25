import { Address } from "@solana/addresses";
import { useQueries, useQuery } from "@tanstack/react-query";
import { create, indexedResolver, windowScheduler } from "@yornaath/batshit";

import { getCoingeckoId } from "@/lib/Token";
import { queryClient } from "@/pages/_app";

import { useProgram } from "./useProgram";

export interface PriceStat {
  change24hr: number;
  currentPrice: number;
  high24hr: number;
  low24hr: number;
}

const coingeckoBatcher = create({
  name: "coingecko",
  fetcher: async (mints: Address[]) => {
    const ids = mints.map(getCoingeckoId).join(",");
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
          mints.reduce(
            (acc, mint) => {
              const d = data[getCoingeckoId(mint)!];
              acc[mint.toString()] = {
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
  const program = useProgram();

  return useQuery<PriceStat>({
    queryKey: ["price", mint?.toString()],
    enabled: !!program && !!mint,
    queryFn: () => coingeckoBatcher.fetch(mint!) as Promise<PriceStat>,
    staleTime: 5 * ONE_MINUTE,
  });
};

export const usePrices = (mints: Address[]) => {
  return useQueries({
    queries: mints.map((mint) => ({
      queryKey: ["price", mint.toString()],
      queryFn: () => coingeckoBatcher.fetch(mint) as Promise<PriceStat>,
      staleTime: 60 * 1000,
    })),
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
