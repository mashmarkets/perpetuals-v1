import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import PerpetualsJson from "@/target/idl/perpetuals.json";
import { IDL, Perpetuals } from "@/target/types/perpetuals";

export type PerpetualsProgram = Program<Perpetuals>;
export const useProgram = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  if (!wallet || !connection) {
    undefined;
  }
  const provider = new AnchorProvider(connection, wallet as Wallet, {});
  const programId = new PublicKey(PerpetualsJson.metadata.address);
  return new Program<Perpetuals>(IDL, programId, provider);
};
