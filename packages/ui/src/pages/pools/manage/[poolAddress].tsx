import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-toastify";

import { addCustody as addCustodyFn } from "@/actions/perpetuals";
import AddCustodyForm, { AddCustodyParams } from "@/components/FormListAsset";
import { usePool, usePoolCustodies } from "@/hooks/perpetuals";
import { useWritePerpetualsProgram } from "@/hooks/useProgram";
import { safeAddress } from "@/utils/utils";

const Accordion = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
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

const ManagePoolPage = () => {
  const router = useRouter();
  const program = useWritePerpetualsProgram();
  const queryClient = useQueryClient();
  const poolAddress = safeAddress(router.query.poolAddress);

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
      console.log("Creating custody with params", params);
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

  const renderDetails = (obj: Record<string, unknown>, depth = 0) => {
    return Object.entries(obj).map(([key, value]) => {
      let renderedValue;

      if (typeof value === "object" && value !== null) {
        renderedValue = (
          <div style={{ marginLeft: `${depth * 10}px` }}>
            {renderDetails(value as Record<string, unknown>, depth + 1)}
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

  if (!pool) {
    return <p>Loading...</p>;
  }

  return (
    <div className="container mx-auto mt-12 rounded-lg bg-zinc-900 p-6">
      <h1 className="mb-4 text-2xl font-bold text-white">
        Manage {pool?.name}
      </h1>

      <div className="text-white">
        <Accordion title="Pool Details">{renderDetails(pool)}</Accordion>
      </div>

      <div className="text-white">
        {Object.values(custodies).map((custody, index) => (
          <div key={index} className="mb-4">
            <Accordion title={`Custody - ${pool.custodies[index]?.toString()}`}>
              {renderDetails(custody)}
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
