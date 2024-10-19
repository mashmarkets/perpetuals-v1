import { PublicKey } from "@solana/web3.js";

export function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export const safePublicKey = (key: unknown): PublicKey | undefined => {
  try {
    return new PublicKey(key as string);
  } catch {
    return undefined;
  }
};
