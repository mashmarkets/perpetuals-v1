import { Address } from "@solana/addresses";
import {
  Account,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { getTokenInfo, getTokenList, SOL_MINT } from "@/lib/Token";
import { queryClient } from "@/utils/queryClient";

import { useCurrentEpoch } from "./competition";
import { connectionBatcher } from "./connection";

const ONE_MINUTE = 60 * 1000;
queryClient.setQueryDefaults(["account"], {
  refetchInterval: 1000 * 10,
  staleTime: 400,
});
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

// Like getAssociatedTokenAddressSync, but for handles SOL_MINT
const getTokenPublicKey = (
  mint: Address | undefined,
  user: Address | undefined,
) => {
  if (mint === undefined || user === undefined) {
    return undefined;
  }
  // For Solana balance, just look up the user's account
  if (mint === SOL_MINT) {
    return user;
  }
  // Otherwise the user's associated token account

  return getAssociatedTokenAddressSync(
    new PublicKey(mint),
    new PublicKey(user),
    true,
  ).toString() as Address;
};

export const useAccount = (
  mint: Address | undefined,
  user: PublicKey | undefined | null, // null cause thats what useWallet returns
) => {
  const { connection } = useConnection();

  const publicKey = getTokenPublicKey(
    mint,
    user?.toString() as Address | undefined,
  );

  return useQuery({
    queryKey: ["account", user?.toString(), mint],
    enabled: publicKey !== undefined,
    queryFn: () =>
      connectionBatcher(connection)
        .fetch(publicKey!)
        .then((info) => {
          if (info !== null && mint !== SOL_MINT.toString()) {
            return unpackAccount(new PublicKey(publicKey!), info);
          }
          return info;
        }),
  });
};

const useAccounts = (mints: Address[], users: Address[]) => {
  const { connection } = useConnection();
  const pairs = mints.flatMap((mint) => users.map((user) => [mint, user]));
  return useQueries({
    queries: pairs.map(([mint, user]) => {
      const publicKey = getTokenPublicKey(mint, user)!;
      return {
        queryKey: ["account", user, mint],
        queryFn: () =>
          connectionBatcher(connection)
            .fetch(publicKey)
            .then((info) => {
              if (info !== null && mint !== SOL_MINT.toString()) {
                return unpackAccount(new PublicKey(publicKey!), info);
              }
              return info;
            }),
      };
    }),
    combine: (results) => {
      return results.reduce(
        (acc, v, i) => {
          const [mint, user] = pairs[i];
          if (acc[mint] === undefined) {
            acc[mint] = {};
          }
          acc[mint][user] = v.data as AccountInfo<Buffer> | Account | null;
          return acc;
        },
        {} as Record<
          Address,
          Record<Address, AccountInfo<Buffer> | Account | null>
        >,
      );
    },
  });
};

export const useBalance = (
  mint: Address | undefined,
  user: PublicKey | undefined | null, // null cause thats what useWallet returns
) => {
  const { data, ...rest } = useAccount(mint, user);
  if (data === undefined || mint === undefined) {
    return { ...rest, data: undefined };
  }

  const balance =
    mint === SOL_MINT.toString()
      ? (data as AccountInfo<Buffer>)?.lamports
        ? BigInt((data as AccountInfo<Buffer>).lamports)
        : BigInt(0)
      : (data as Account)?.amount;

  return { ...rest, data: balance };
};

export const useBalances = (mint: Address | undefined, users: Address[]) => {
  const accounts = useAccounts(mint ? [mint] : [], users);

  if (mint === undefined) {
    return {};
  }
  return Object.entries(accounts?.[mint] ?? {}).reduce(
    (acc, [user, account]) => {
      if (account === null || account === undefined) {
        return acc;
      }
      acc[user as Address] =
        mint === SOL_MINT.toString()
          ? BigInt((account as AccountInfo<Buffer>).lamports)
          : (account as Account).amount;
      return acc;
    },
    {} as Record<Address, bigint>,
  );
};

export const useAllMintHolders = (mint: Address | undefined) => {
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["holders", mint?.toString()],
    staleTime: ONE_MINUTE,
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

      const accounts = data.map((x) => {
        if (mint === SOL_MINT.toString()) {
          return x.account;
        }
        return unpackAccount(new PublicKey(mint!), x.account);
      });

      accounts.forEach((account) => {
        queryClient.setQueryData(
          ["account", account.owner.toString(), mint],
          account,
        );
      });

      return accounts.map((x) => x.owner.toString() as Address);
    },
  });
};

export const useTokenList = () => {
  const epoch = useCurrentEpoch();
  return useMemo(() => getTokenList(epoch), [epoch]);
};

export const useTradeableMints = () => {
  const epoch = useCurrentEpoch();
  return useMemo(() => {
    return (
      getTokenList(epoch)
        // .filter( // 1000x Leverage Pairs
        //   (x) =>
        //     ["Bonk", "SOL", "WBTC"].includes(x.symbol) &&
        //     x.address !== SOL_MINT,
        // )
        .filter(
          (x) =>
            !x.symbol.startsWith("US") && x.address !== NATIVE_MINT.toString(),
        )
        .sort((a, b) => a.symbol.localeCompare(b.symbol))
        .map((x) => x.address) as Address[]
    );
  }, [epoch]);
};

// Because of the way current epoch updates on interval, it might be "out of sync"
// So force consistency
export const useGetTokenInfo = () => {
  const epoch = useCurrentEpoch();
  const get = (mint: Address | undefined) => getTokenInfo(mint, epoch);
  return {
    getTokenInfo: get,
    getTokenSymbol: (mint: Address | undefined) => get(mint!)?.symbol ?? "???",
    getTokenLabel: (mint: Address | undefined) => get(mint!)?.name ?? "Unknown",
    getTokenIcon: (mint: Address | undefined) => {
      const { logoURI, name } = get(mint!) ?? {};
      if (logoURI === undefined) {
        return <></>;
      }

      return (
        // eslint-disable-next-line @next/next/no-img-element -- Don't want to be reliant on vercel deployment for now
        <img
          src={logoURI}
          alt={name}
          width={20}
          height={20}
          className="rounded-full"
        />
      );
    },
  };
};
