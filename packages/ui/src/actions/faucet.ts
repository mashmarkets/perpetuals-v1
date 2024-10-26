import { BN, utils } from "@coral-xyz/anchor";
import { Address } from "@solana/addresses";
import { PublicKey } from "@solana/web3.js";

import { EPOCH } from "@/lib/Token";
import { IDL } from "@/target/faucet";

export const findFaucetAddressSync = (...seeds: unknown[]) => {
  const publicKey = PublicKey.findProgramAddressSync(
    seeds.map((x) => {
      if (x instanceof PublicKey) {
        return x.toBuffer();
      }
      if (typeof x === "string") {
        return utils.bytes.utf8.encode(x);
      }
      if (typeof x === "number" || x instanceof BN) {
        return new BN((x as number).toString()).toArrayLike(Buffer, "le", 8);
      }
      return x;
    }),
    new PublicKey(IDL.metadata.address),
  )[0];

  return publicKey.toString() as Address;
};
export const getFaucetMint = (canonical: Address) =>
  findFaucetAddressSync(
    "mint",
    new PublicKey(canonical),
    new BN(EPOCH.toString()),
  );

// export function createMintToInstruction({
//   payer,
//   seed,
//   amount,
// }: {
//   payer: PublicKey;
//   seed: Address;
//   amount: bigint;
// }) {
//   const mint = getFaucetMint(seed);
//   const ata = getAssociatedTokenAddressSync(new PublicKey(mint), payer);

//   const keys = [
//     { pubkey: payer, isWritable: true, isSigner: true },
//     { pubkey: mint, isWritable: true, isSigner: false },
//     { pubkey: ata, isWritable: true, isSigner: false },
//     {
//       pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
//       isWritable: false,
//       isSigner: false,
//     },
//     {
//       pubkey: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
//       isWritable: false,
//       isSigner: false,
//     },
//     {
//       pubkey: new PublicKey("11111111111111111111111111111111"),
//       isWritable: false,
//       isSigner: false,
//     },
//   ];

//   const data = Buffer.concat([
//     new Uint8Array([0xac, 0x89, 0xb7, 0x0e, 0xcf, 0x6e, 0xea, 0x38]),
//     new PublicKey(seed).toBuffer(),
//     new BN(amount.toString()).toArrayLike(Buffer, "le", 8),
//   ]);

//   return new TransactionInstruction({ keys, programId, data });
// }
