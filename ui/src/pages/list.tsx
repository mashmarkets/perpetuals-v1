import { PublicKey } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import React from "react";

import {
  findPerpetualsAddressSync,
  listAsset as listAssetFn,
} from "@/actions/perpetuals";
import FormListList, { AddCustodyParams } from "@/components/FormListAsset";
import { useProgram } from "@/hooks/useProgram";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";
import { dedupe } from "@/utils/utils";

import { stringify } from "./pools/manage/[poolAddress]";

const CreatePool: React.FC = () => {
  const router = useRouter();
  const program = useProgram();
  const queryClient = useQueryClient();

  const listAsset = useMutation({
    onSuccess: (sig, params: AddCustodyParams) => {
      const poolAddress = findPerpetualsAddressSync("pool", params.poolName);

      queryClient.setQueryData(["pools"], (pools: PublicKey[] | undefined) => {
        return dedupe([...(pools ?? []), poolAddress]);
      });

      router.push("/pools/" + poolAddress);
    },
    mutationFn: async (params: AddCustodyParams) => {
      if (program === undefined) {
        return;
      }
      console.log("Creating pool with params", stringify(params));
      return await wrapTransactionWithNotification(
        program.provider.connection,
        listAssetFn(program, params),
        {
          pending: "Listing Asset",
          success: "Asset Listed",
          error: "Failed to list asset",
        },
      );
    },
  });

  return (
    <div className="container mx-auto mt-10 max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold text-white">List a new asset</h1>
      <div className="container mx-auto rounded-lg bg-zinc-900 p-6">
        <FormListList
          custodies={[]}
          poolName={""}
          onSubmit={listAsset.mutate}
        />
      </div>
    </div>
  );
};

export default CreatePool;
