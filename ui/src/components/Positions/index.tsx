"use client";

import { useWallet } from "@solana/wallet-adapter-react";

import { ExistingPositions } from "@/components/Positions/ExistingPositions";
import { NoPositions } from "@/components/Positions/NoPositions";

interface Props {
  className?: string;
}

export function Positions(props: Props) {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return (
      <div className={props.className}>
        <header className="mb-5 flex items-center space-x-4">
          <div className="font-medium text-white">My Positions</div>
        </header>

        <NoPositions emptyString="No Open Positions" />
      </div>
    );
  }

  return (
    <div className={props.className}>
      <header className="mb-5 flex items-center space-x-4">
        <div className="font-medium text-white">My Positions</div>
      </header>
      <ExistingPositions />
    </div>
  );
}
