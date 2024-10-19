import { BN as AnchorBN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BN } from "bn.js";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-toastify";

import { addCustody as addCustodyFn } from "@/actions/perpetuals";
import AddCustodyForm, { AddCustodyParams } from "@/components/FormListAsset";
import { usePool, usePoolCustodies } from "@/hooks/perpetuals";
import { useProgram } from "@/hooks/useProgram";
import { safePublicKey } from "@/utils/utils";

const Accordion = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-8">
      <button
        className="w-full rounded-lg bg-zinc-800 p-2 text-left text-xl font-bold text-white focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "▼" : "►"} {title}
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
};

export function stringify(v: any): any {
  if (v instanceof PublicKey || v instanceof BN || v instanceof AnchorBN) {
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

const ManagePoolPage = () => {
  const router = useRouter();
  const program = useProgram();
  const queryClient = useQueryClient();
  const poolAddress = safePublicKey(router.query.poolAddress);
  const { data: pool, isLoading } = usePool(poolAddress);
  const custodies = usePoolCustodies(poolAddress);

  const addCustody = useMutation({
    onSuccess: (sig) => {
      console.log("Custody created with: ", sig);
      queryClient.invalidateQueries({
        queryKey: ["pool", poolAddress?.toString()],
      });
      toast.success("Custody created successfully");
    },
    onError: (error) => {
      console.log(error);
    },
    mutationFn: async (params: AddCustodyParams) => {
      if (program === undefined) {
        return;
      }
      console.log("Creating custody with params", stringify(params));
      return await addCustodyFn(program, params);
    },
  });

  // TODO:- Custodies passed into Add Parameters needs to be mints (or fetch inside component)
  if (isLoading || pool === undefined) {
    return (
      <div className="container mx-auto mt-12 rounded-lg bg-zinc-900 p-6 text-white">
        Loading...
      </div>
    );
  }

  const renderDetails = (obj: any, depth = 0) => {
    return Object.entries(obj).map(([key, value]) => {
      let renderedValue;

      if (typeof value === "object" && value !== null) {
        renderedValue = (
          <div style={{ marginLeft: `${depth * 10}px` }}>
            {renderDetails(value, depth + 1)}
          </div>
        );
      } else {
        renderedValue = String(value);
      }

      return (
        <div
          key={key}
          className="mb-2"
          style={{ marginLeft: `${depth * 10}px` }}
        >
          <span className="font-semibold">{key}: </span>
          <span>{renderedValue}</span>
        </div>
      );
    });
  };

  return (
    <div className="container mx-auto mt-12 rounded-lg bg-zinc-900 p-6">
      <h1 className="mb-4 text-2xl font-bold text-white">Manage {pool.name}</h1>

      <div className="text-white">
        <Accordion title="Pool Details">
          {renderDetails(stringify(pool))}
        </Accordion>
      </div>

      <div className="text-white">
        {Object.values(custodies).map((custody, index) => (
          <div key={index} className="mb-4">
            <Accordion title={`Custody - ${pool.custodies[index]?.toString()}`}>
              {renderDetails(stringify(custody))}
            </Accordion>
          </div>
        ))}
      </div>

      <Accordion title="Add Custody">
        <div className="mt-2">
          <AddCustodyForm
            poolName={pool.name}
            custodies={Object.values(custodies)}
            onSubmit={addCustody.mutate}
          />
        </div>
      </Accordion>
    </div>
  );
};

export default ManagePoolPage;
