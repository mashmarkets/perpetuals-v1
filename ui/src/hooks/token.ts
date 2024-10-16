import {
  getAssociatedTokenAddressSync,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

import { connectionBatcher } from "./accounts";

const ONE_MINUTE = 60 * 1000;
export const useMint = (mint: PublicKey | undefined) => {
  const { connection } = useConnection();
  return useQuery({
    queryKey: ["mint", mint?.toString()],
    enabled: mint !== undefined,
    staleTime: ONE_MINUTE,
    queryFn: () =>
      connectionBatcher(connection)
        .fetch(mint!)
        .then((info) => {
          return unpackMint(mint!, info);
        }),
  });
};

export const useBalance = (
  mint: PublicKey | undefined,
  user: PublicKey | undefined | null, // null cause thats what useWallet returns
) => {
  const { connection } = useConnection();
  return useQuery({
    queryKey: ["balance", user?.toString(), mint?.toString()],
    enabled: mint !== undefined && user !== undefined && user !== null,
    queryFn: () => {
      const ata = getAssociatedTokenAddressSync(mint!, user!);
      return connectionBatcher(connection)
        .fetch(ata)
        .then((info) => {
          return unpackAccount(mint!, info).amount;
        });
    },
  });
};
