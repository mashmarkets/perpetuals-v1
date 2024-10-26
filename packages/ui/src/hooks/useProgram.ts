import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMemo } from "react";

import { Faucet, IDL as FaucetIDL } from "@/target/faucet";
import { Perpetuals, IDL as PerpetualsIDL } from "@/target/perpetuals";

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
    const programId = new PublicKey(PerpetualsIDL.metadata.address);
    return new Program<Perpetuals>(PerpetualsIDL, programId, { connection });
  }, [connection]);
};

export const useWritePerpetualsProgram = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  return useMemo(() => {
    if (!wallet) {
      return undefined;
    }
    const programId = new PublicKey(PerpetualsIDL.metadata.address);
    const provider = new AnchorProvider(connection, wallet as Wallet, {});
    return new Program<Perpetuals>(PerpetualsIDL, programId, provider);
  }, [wallet, connection]);
};

export const useWriteFaucetProgram = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  return useMemo(() => {
    if (!wallet) {
      return undefined;
    }
    const programId = new PublicKey(FaucetIDL.metadata.address);
    const provider = new AnchorProvider(connection, wallet as Wallet, {});
    return new Program<Faucet>(FaucetIDL, programId, provider);
  }, [wallet, connection]);
};
