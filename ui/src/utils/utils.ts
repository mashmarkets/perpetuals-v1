import { Address, isAddress } from "@solana/addresses";

export function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr).values());
}

export const safeAddress = (input: unknown): Address | undefined =>
  typeof input === "string" && isAddress(input)
    ? (input as Address)
    : undefined;
