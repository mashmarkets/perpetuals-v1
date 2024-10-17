"use client";

import { ExistingPositions } from "@/components/Positions/ExistingPositions";

export default function Admin(props: { className?: string }) {
  return (
    <div className={props.className}>
      <header className="mb-5 flex items-center space-x-4">
        <div className="font-medium text-white">All Positions</div>
      </header>
      <ExistingPositions />
    </div>
  );
}
