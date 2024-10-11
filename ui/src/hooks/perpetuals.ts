import { IdlAccounts, utils } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useQueries, useQuery } from "@tanstack/react-query";
import { create, indexedResolver, windowScheduler } from "@yornaath/batshit";
import { memoize } from "lodash-es";

import { Perpetuals } from "@/target/types/perpetuals";

import { PerpetualsProgram, useProgram } from "./useProgram";

export type Pool = IdlAccounts<Perpetuals>["pool"];
export type Custody = IdlAccounts<Perpetuals>["custody"];
export const usePool = (pool: PublicKey | undefined) => {
  const program = useProgram();
  return useQuery<Pool>({
    queryKey: ["pool", pool?.toString()],
    enabled: !!program || !!pool,
    queryFn: () => program.account.pool.fetch(pool!),
  });
};

const custodiesBatcher = memoize((program: PerpetualsProgram) =>
  create({
    name: "custody",
    fetcher: async (accounts: PublicKey[]) => {
      const data = await program.account.custody.fetchMultiple(accounts);
      // Index the data by the account key, so it can resolved
      return data.reduce(
        (acc, v, i) => {
          acc[accounts[i]!.toString()] = v;
          return acc;
        },
        {} as Record<string, Custody | null>,
      );
    },
    resolver: indexedResolver(),
    scheduler: windowScheduler(10),
  }),
);

// Inspired by https://github.com/TanStack/query/discussions/6305
export const useCustodies = (custodies: PublicKey[]) => {
  const program = useProgram();

  return useQueries<Custody[]>({
    queries: custodies.map((custody) => ({
      queryKey: ["custody", custody.toString()],
      enabled: !!program,
      queryFn: () => custodiesBatcher(program).fetch(custody),
    })),
  });
};
