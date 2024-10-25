import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import { IDL, Perpetuals } from "@/target/perpetuals";

export const useAnchorProvider = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  if (!wallet || !connection) {
    return undefined;
  }

  return new AnchorProvider(connection, wallet as Wallet, {});
};

export const useProgram = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const programId = new PublicKey(IDL.metadata.address);

  if (!wallet) {
    return new Program<Perpetuals>(IDL, programId, { connection });
  }

  const provider = new AnchorProvider(connection, wallet as Wallet, {});
  return new Program<Perpetuals>(IDL, programId, provider);
};
