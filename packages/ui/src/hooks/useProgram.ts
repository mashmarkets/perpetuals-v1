import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMemo } from "react";

import { IDL, Perpetuals } from "@/target/perpetuals";

export const useAnchorProvider = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  if (!wallet || !connection) {
    return undefined;
  }

  return new AnchorProvider(connection, wallet as Wallet, {});
};

export const useReadPerpetualsProgram = () => {
  const { connection } = useConnection();

  return useMemo(() => {
    const programId = new PublicKey(IDL.metadata.address);
    return new Program<Perpetuals>(IDL, programId, { connection });
  }, [connection]);
};

export const useWritePerpetualsProgram = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  return useMemo(() => {
    if (!wallet) {
      return undefined;
    }
    const programId = new PublicKey(IDL.metadata.address);
    const provider = new AnchorProvider(connection, wallet as Wallet, {});
    return new Program<Perpetuals>(IDL, programId, provider);
  }, [wallet, connection]);
};
