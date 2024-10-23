import { BN } from "@coral-xyz/anchor";
import { Address } from "@solana/addresses";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

const programId = new PublicKey("dropFMi3YzWh5FJysWwmSfnGhh2LuGdXHm1wzNuu71z");

export const getFaucetMint = (seed: Address) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), new PublicKey(seed).toBuffer()],
    programId,
  )[0];

export function createMintToInstruction({
  payer,
  seed,
  amount,
}: {
  payer: PublicKey;
  seed: Address;
  amount: bigint;
}) {
  const mint = getFaucetMint(seed);
  const ata = getAssociatedTokenAddressSync(mint, payer);

  const keys = [
    { pubkey: payer, isWritable: true, isSigner: true },
    { pubkey: mint, isWritable: true, isSigner: false },
    { pubkey: ata, isWritable: true, isSigner: false },
    {
      pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: new PublicKey("11111111111111111111111111111111"),
      isWritable: false,
      isSigner: false,
    },
  ];

  const data = Buffer.concat([
    new Uint8Array([0xac, 0x89, 0xb7, 0x0e, 0xcf, 0x6e, 0xea, 0x38]),
    new PublicKey(seed).toBuffer(),
    new BN(amount.toString()).toArrayLike(Buffer, "le", 8),
  ]);

  return new TransactionInstruction({ keys, programId, data });
}
