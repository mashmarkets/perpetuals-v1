import { IdlAccounts } from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { Perpetuals } from "@/target/types/perpetuals";

import { connectionBatcher } from "./accounts";
import { useProgram } from "./useProgram";

export type Pool = IdlAccounts<Perpetuals>["pool"];
export type Custody = IdlAccounts<Perpetuals>["custody"];
export type Position = IdlAccounts<Perpetuals>["position"];

export const usePool = (pool: PublicKey | undefined) => {
  const { connection } = useConnection();
  const program = useProgram();

  return useQuery({
    queryKey: ["pool", pool?.toString()],
    enabled: !!program && !!pool,
    queryFn: () =>
      connectionBatcher(connection)
        .fetch(pool!)
        .then((info) => {
          const coder = program.account.pool.coder;
          return coder.accounts.decode("pool", info!.data!);
        }) as Promise<Pool>,
  });
};

export const useAllPools = () => {
  const program = useProgram();
  const client = useQueryClient();
  return useQuery<Record<string, Pool>>({
    queryKey: ["pool"],
    enabled: !!program,
    queryFn: async () => {
      const data = await program.account.pool.all();
      const pools = data.reduce(
        (acc, v) => {
          acc[v.publicKey.toString()] = v.account;
          return acc;
        },
        {} as Record<string, Pool>,
      );

      // Update individual pool cache
      Object.entries(pools).forEach(([key, pool]) => {
        client.setQueryData(["pool", key], pool);
      });
      return pools;
    },
  });
};

// Inspired by https://github.com/TanStack/query/discussions/6305
export const useCustodies = (custodies: PublicKey[]) => {
  const { connection } = useConnection();
  const program = useProgram();

  // TODO:- Add a combine here for better ergonomics
  return useQueries({
    queries: custodies.map((custody) => ({
      queryKey: ["custody", custody.toString()],
      enabled: !!program,
      queryFn: () =>
        connectionBatcher(connection)
          .fetch(custody)
          .then((info) => {
            const coder = program.account.custody.coder;
            return coder.accounts.decode("custody", info!.data!);
          }) as Promise<Custody>,
    })),
  });
};

export const usePoolCustodies = (poolKey: PublicKey | undefined) => {
  const { connection } = useConnection();
  const program = useProgram();
  const pool = usePool(poolKey);

  const custodies = pool?.data?.custodies ?? [];

  return useQueries({
    queries: custodies.map((custody) => ({
      queryKey: ["custody", custody.toString()],
      enabled: !!program || pool.data !== undefined,
      queryFn: () =>
        connectionBatcher(connection)
          .fetch(custody)
          .then((info) => {
            const coder = program.account.custody.coder;
            return coder.accounts.decode("custody", info!.data!);
          }) as Promise<Custody>,
    })),
    combine: (results) => {
      return results.reduce(
        (acc, v, i) => {
          if (v.data === undefined) {
            return acc;
          }
          acc[custodies[i]!.toString()] = v.data!;
          return acc;
        },
        {} as Record<string, Custody>,
      );
    },
  });
};

export const useAllPositions = () => {
  const program = useProgram();
  const client = useQueryClient();
  return useQuery<Record<string, Position>>({
    queryKey: ["position"],
    enabled: !!program,
    queryFn: async () => {
      const data = await program.account.position.all();
      const positions = data.reduce(
        (acc, v) => {
          acc[v.publicKey.toString()] = v.account;
          return acc;
        },
        {} as Record<string, Position>,
      );

      // Update individual cache
      Object.entries(positions).forEach(([key, position]) => {
        client.setQueryData(["position", key], position);
      });
      return positions;
    },
  });
};

export const useAllUserPositions = (user: PublicKey | null) => {
  const { data, ...query } = useAllPositions();
  return {
    ...query,
    data:
      data === undefined || user === null
        ? undefined
        : Object.entries(data).reduce(
            (acc, [key, position]) => {
              if (position.owner.toString() === user.toString()) {
                acc[key] = position;
              }
              return acc;
            },
            {} as Record<string, Position>,
          ),
  };
};
