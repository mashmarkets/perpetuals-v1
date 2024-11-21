import { Address } from "@solana/addresses";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  AccountInfo,
  Connection,
  PublicKey,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Batcher,
  create,
  indexedResolver,
  windowedFiniteBatchScheduler,
} from "@yornaath/batshit";
import { memoize } from "lodash-es";
import PQueue from "p-queue";

export const connectionBatcher = memoize(
  (connection: Connection) =>
    create({
      name: "account",
      fetcher: async (accounts: Address[]) => {
        // If there is only one account, we can just get the account info (uses less rpc credits)
        if (accounts.length === 1) {
          const data = await connection.getAccountInfo(
            new PublicKey(accounts[0]),
          );
          return {
            [accounts[0].toString()]: data,
          };
        }
        const data = await connection.getMultipleAccountsInfo(
          accounts.map((x) => new PublicKey(x)),
        );
        // Index the data by the account key, so it can resolved
        return data.reduce(
          (acc, v, i) => {
            acc[accounts[i]!.toString()] = v;
            return acc;
          },
          {} as Record<string, AccountInfo<Buffer> | null>,
        );
      },
      resolver: indexedResolver(),
      scheduler: windowedFiniteBatchScheduler({
        windowMs: 10,
        maxBatchSize: 100, // API limits to 100 accounts per request
      }),
    }) as Batcher<
      Record<string, AccountInfo<Buffer> | null>,
      Address,
      AccountInfo<Buffer> | null
    >,
);

export const useSignaturesForAddress = (address: Address | undefined) => {
  const { connection } = useConnection();

  // Only return a list of signatures, so its easier to inject a need tx signature
  return useQuery({
    queryKey: ["getSignaturesForAddress", address],
    enabled: address !== undefined,
    refetchInterval: 5 * 1000,
    queryFn: () =>
      connection
        .getSignaturesForAddress(new PublicKey(address!), {
          limit: 1000, // Max allowed by rpc
        })
        .then((x) => x.map((y) => y.signature)),
  });
};

// Limit is 40 per 10 seconds
const useTransactionsQueue = new PQueue({
  concurrency: 1,
  intervalCap: 30,
  interval: 1000 * 10,
});

export const useTransactions = (signatures: string[]) => {
  const { connection } = useConnection();

  return useQueries({
    queries: signatures.map((sig) => {
      return {
        queryKey: ["getTransaction", sig],
        staleTime: Infinity,
        gcTime: Infinity,
        enabled: true,
        queryFn: async () => {
          return await useTransactionsQueue.add(async () => {
            return await connection.getTransaction(sig, {
              maxSupportedTransactionVersion: 0,
            });
          });
        },
      };
    }),
    combine: (results) => {
      return results.reduce(
        (acc, v, i) => {
          acc[signatures[i]] = v.data!;
          return acc;
        },
        {} as Record<string, VersionedTransactionResponse | null>,
      );
    },
  });
};
