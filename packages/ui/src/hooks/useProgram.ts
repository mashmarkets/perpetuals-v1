import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

import { Faucet } from "@/target/faucet";
import FaucetIDL from "@/target/faucet.json";
import { Perpetuals } from "@/target/perpetuals";
import PerpetualsIDL from "@/target/perpetuals.json";

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
    return new Program<Perpetuals>(PerpetualsIDL as Perpetuals, { connection });
  }, [connection]);
};

export const useWritePerpetualsProgram = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  return useMemo(() => {
    if (!wallet) {
      return undefined;
    }
    const provider = new AnchorProvider(connection, wallet as Wallet, {});
    return new Program<Perpetuals>(PerpetualsIDL as Perpetuals, provider);
  }, [wallet, connection]);
};

export const useWriteFaucetProgram = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  return useMemo(() => {
    if (!wallet) {
      return undefined;
    }
    const provider = new AnchorProvider(connection, wallet as Wallet, {});
    return new Program<Faucet>(FaucetIDL as Faucet, provider);
  }, [wallet, connection]);
};
