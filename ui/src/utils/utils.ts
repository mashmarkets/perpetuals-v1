import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr).values());
}

export const safePublicKey = (key: unknown): PublicKey | undefined => {
  try {
    return new PublicKey(key as string);
  } catch {
    return undefined;
  }
};

export function stringify(v: any): any {
  if (v instanceof PublicKey || v instanceof BN) {
    return v.toString();
  }
  if (v instanceof Date) {
    return v.toLocaleString();
  }

  if (Array.isArray(v)) {
    return v.map((item) => stringify(item));
  }

  // Check if it is an anchor enum
  if (typeof v === "object" && v !== null) {
    const keys = Object.keys(v);
    if (keys.length === 1 && Object.keys(v[keys[0]!]).length === 0) {
      return keys[0];
    }
  }

  // If it's an object, recursively process its keys
  if (typeof v === "object" && v !== null) {
    const result: { [key: string]: any } = {};
    const singleValueKeys: string[] = [];
    const complexKeys: string[] = [];

    Object.keys(v)
      .sort()
      .forEach((key) => {
        const value = stringify(v[key]);
        if (typeof value === "object" || Array.isArray(value)) {
          complexKeys.push(key);
        } else {
          singleValueKeys.push(key);
        }
        result[key] = value;
      });

    const sortedResult: { [key: string]: any } = {};
    [...singleValueKeys, ...complexKeys].forEach((key) => {
      sortedResult[key] = result[key];
    });

    return sortedResult;
  }

  // For primitive types, return the value as it is
  return v;
}
