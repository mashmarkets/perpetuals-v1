import React, { useState } from "react";
import { useRouter } from "next/router";
import { PerpetualsClient } from "@/app/client";

const CreatePool: React.FC = () => {
  const [poolName, setPoolName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!poolName.trim()) {
      setError("Pool name is required");
      return;
    }

    try {
      // const client = new PerpetualsClient(); // You might need to pass appropriate parameters here
      // await client.addPool(poolName);
      router.push("/pools"); // Redirect to pools list page after successful creation
    } catch (err) {
      setError(`Failed to create pool: ${err.message}`);
    }
  };

  return (
    <div className="container mx-auto max-w-md mt-10">
      <h1 className="text-3xl font-bold mb-6">Create New Pool</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="poolName"
            className="block text-sm font-medium text-gray-700"
          >
            Pool Name
          </label>
          <input
            type="text"
            id="poolName"
            value={poolName}
            onChange={(e) => setPoolName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <button
          type="submit"
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Create Pool
        </button>
        <p className="text-slate-500">
          You will be able to configure the pool in the next step.
        </p>
      </form>
    </div>
  );
};

export default CreatePool;
