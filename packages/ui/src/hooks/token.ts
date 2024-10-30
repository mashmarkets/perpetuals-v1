import { address, Address } from "@solana/addresses";
import {
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { connectionBatcher } from "./accounts";

const ONE_MINUTE = 60 * 1000;
export const useMint = (mint: Address | undefined) => {
  const { connection } = useConnection();
  return useQuery({
    queryKey: ["mint", mint?.toString()],
    enabled: mint !== undefined,
    staleTime: ONE_MINUTE,
    queryFn: () =>
      connectionBatcher(connection)
        .fetch(mint!)
        .then((info) => {
          return unpackMint(new PublicKey(mint!), info);
        }),
  });
};

export const useBalance = (
  mint: Address | undefined,
  user: PublicKey | undefined | null, // null cause thats what useWallet returns
) => {
  const { connection } = useConnection();
  return useQuery({
    queryKey: ["balance", user?.toString(), mint],
    enabled: mint !== undefined && user !== undefined && user !== null,
    queryFn: () => {
      if (mint?.toString() === NATIVE_MINT.toString()) {
        return connection.getBalance(user!).then((x) => BigInt(x.toString()));
      }
      const ata = getAssociatedTokenAddressSync(new PublicKey(mint!), user!);
      return connectionBatcher(connection)
        .fetch(address(ata.toString()))
        .then((info) => {
          return unpackAccount(new PublicKey(mint!), info).amount;
        });
    },
  });
};

export const useBalances = (mint: Address | undefined, users: Address[]) => {
  const { connection } = useConnection();
  return useQueries({
    queries: users.map((user) => ({
      queryKey: ["balance", user?.toString(), mint],
      enabled: mint !== undefined,
      queryFn: () => {
        if (mint?.toString() === NATIVE_MINT.toString()) {
          return connection
            .getBalance(new PublicKey(user!))
            .then((x) => BigInt(x.toString()));
        }
        const ata = getAssociatedTokenAddressSync(
          new PublicKey(mint!),
          new PublicKey(user!),
        );
        return connectionBatcher(connection)
          .fetch(address(ata.toString()))
          .then((info) => {
            return unpackAccount(new PublicKey(mint!), info).amount;
          });
      },
    })),
    combine: (results) => {
      return results.reduce(
        (acc, v, i) => {
          acc[users[i]] = v.data!;
          return acc;
        },
        {} as Record<string, bigint>,
      );
    },
  });
};

export const useAllMintHolders = (mint: Address | undefined) => {
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["holders", mint?.toString()],
    enabled: mint !== undefined,
    // staleTime: ONE_MINUTE,
    queryFn: async () => {
      const data = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        encoding: "base64",
        filters: [
          {
            dataSize: 165,
          },
          {
            memcmp: {
              offset: 0,
              bytes: mint!,
            },
          },
        ],
      });

      const accounts = data.map((x) =>
        unpackAccount(new PublicKey(mint!), x.account),
      );

      console.log("Accounts: ", accounts);
      accounts.forEach((account) => {
        queryClient.setQueryData(
          ["balance", account.owner.toString(), mint],
          account.amount,
        );
      });

      return accounts.map((x) => x.owner.toString() as Address);
    },
  });
};
