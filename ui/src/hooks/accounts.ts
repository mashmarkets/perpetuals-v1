import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import { create, indexedResolver, windowScheduler } from "@yornaath/batshit";
import { memoize } from "lodash-es";

export const connectionBatcher = memoize((connection: Connection) =>
  create({
    name: "account",
    fetcher: async (accounts: PublicKey[]) => {
      const data = await connection.getMultipleAccountsInfo(accounts);
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
    scheduler: windowScheduler(10),
  }),
);
