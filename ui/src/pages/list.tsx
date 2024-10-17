import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  findPerpetualsAddressSync,
  listAsset as listAssetFn,
} from "src/actions/perpetuals";

import FormListList, { AddCustodyParams } from "@/components/FormListAsset";
import { useProgram } from "@/hooks/useProgram";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

import { stringify } from "./pools/manage/[poolAddress]";

const CreatePool: React.FC = () => {
  const router = useRouter();
  const program = useProgram();

  const listAsset = useMutation({
    onSuccess: (sig, params: AddCustodyParams) => {
      router.push(
        "/pools/" + findPerpetualsAddressSync("pool", params.poolName),
      );
    },
    mutationFn: async (params: AddCustodyParams) => {
      if (program === undefined) {
        return;
      }
      console.log("Creating pool with params", stringify(params));
      return await wrapTransactionWithNotification(
        program.provider.connection,
        listAssetFn(program, params),
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
