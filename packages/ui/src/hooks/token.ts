import { address, Address } from "@solana/addresses";
import {
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  unpackAccount,
  unpackMint,
} from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

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
