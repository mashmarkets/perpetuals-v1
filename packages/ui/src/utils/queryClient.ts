import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import SuperJSON from "superjson";

SuperJSON.registerCustom<PublicKey, string>(
  {
    isApplicable: (v): v is PublicKey => v instanceof PublicKey,
    serialize: (v) => v.toString(),
    deserialize: (v) => new PublicKey(v),
  },
  "PublicKey",
);
SuperJSON.registerCustom<BN, string>(
  {
    isApplicable: (v): v is BN => v instanceof BN,
    serialize: (v) => v.toString(),
    deserialize: (v) => new BN(v),
  },
  "bn.js",
);

SuperJSON.registerCustom<Buffer, string>(
  {
    isApplicable: (v): v is BN => v instanceof Uint8Array,
    serialize: (v) => v.toString("base64"),
    deserialize: (v) => Buffer.from(v, "base64"),
  },
  "buffer",
);
// Separate file as I was experiencing some circular dependency issue
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000,
      gcTime: 1000 * 60 * 60 * 24, // 24 Hours
    },
  },
});

export const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined, // have to do this for NextJS
  key: "REACT_QUERY_OFFLINE_CACHE",
  serialize: (value) => SuperJSON.stringify(value),
  deserialize: (value) => SuperJSON.parse(value),
});
