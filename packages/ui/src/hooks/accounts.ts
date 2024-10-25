import { Address } from "@solana/addresses";
import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import {
  Batcher,
  create,
  indexedResolver,
  windowedFiniteBatchScheduler,
} from "@yornaath/batshit";
import { memoize } from "lodash-es";

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
