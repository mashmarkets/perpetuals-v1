import { Program } from "@coral-xyz/anchor-29";
import { Address } from "@solana/addresses";
import { useConnection } from "@solana/wallet-adapter-react";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { useQueries, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/utils/queryClient";

import { IDL, PythSolanaReceiver } from "../idls/pythSolanaReceiver";
import { connectionBatcher } from "./accounts";
import { fromBN } from "./perpetuals";
import { useGetTokenInfo } from "./token";

queryClient.setQueryDefaults(["pyth"], {
  refetchInterval: 2000, //
});

const parsePriceUpdateV2 = (
  address: Address,
  info: AccountInfo<Buffer> | null,
) => {
  // data: ProgramAccount<IdlAccounts<PythSolanaReceiver>["priceUpdateV2"]>,
  if (info === null) {
    return null;
  }
  const p = program.account.priceUpdateV2.coder.accounts.decode(
    "priceUpdateV2",
    info.data!,
  );
  return {
    address,
    postedSlot: fromBN(p.postedSlot),
    priceMessage: {
      conf: fromBN(p.priceMessage.conf),
      emaConf: fromBN(p.priceMessage.emaConf),
      emaPrice: fromBN(p.priceMessage.emaPrice),
      exponent: p.priceMessage.exponent,
      feedId: Buffer.from(p.priceMessage.feedId).toString("hex"),
      prevPublishTime: new Date(
        p.priceMessage.prevPublishTime.toNumber() * 1000,
      ),
      price: fromBN(p.priceMessage.price),
      publishTime: new Date(p.priceMessage.publishTime.toNumber() * 1000),
    },
    verificationLevel: Object.keys(p.verificationLevel)[0] as
      | "full"
      | "partial",
    writeAuthority: p.writeAuthority.toString() as Address,
  };
};
const program = new Program<PythSolanaReceiver>(
  IDL as PythSolanaReceiver,
  new PublicKey("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ"),
  // @ts-expect-error -- we only need decoder so don't pass a provider
  {},
);

export const usePriceUpdateV2 = (mint: Address | undefined) => {
  const { connection } = useConnection();
  const { getTokenInfo } = useGetTokenInfo();
  const oracle = getTokenInfo(mint!)?.extensions.oracle;

  return useQuery({
    queryKey: ["pyth", oracle],
    enabled: !!mint && oracle !== undefined,
    queryFn: () =>
      connectionBatcher(connection)
        .fetch(oracle!)
        .then((info) => parsePriceUpdateV2(oracle!, info)),
  });
};

export const usePrice = (mint: Address | undefined) => {
  const hook = usePriceUpdateV2(mint);

  const priceMessage = hook.data?.priceMessage;
  const price = priceMessage
    ? Number(priceMessage.price) * 10 ** priceMessage.exponent
    : undefined;
  return { ...hook, data: price };
};

export const usePrices = (mints: Address[]) => {
  const { connection } = useConnection();
  const { getTokenInfo } = useGetTokenInfo();

  return useQueries({
    queries: mints.map((mint) => {
      const oracle = getTokenInfo(mint!)?.extensions.oracle;
      return {
        queryKey: ["pyth", oracle],
        enabled: oracle !== undefined,
        queryFn: () =>
          connectionBatcher(connection)
            .fetch(oracle!)
            .then((info) => parsePriceUpdateV2(oracle!, info)),
      };
    }),
    combine: (results) => {
      return results.reduce(
        (acc, v, i) => {
          acc[mints[i]] =
            Number(v.data?.priceMessage.price) *
            10 ** v.data?.priceMessage.exponent;
          return acc;
        },
        {} as Record<string, number>,
      );
    },
  });
};
