import { Address } from "@solana/addresses";
import { NATIVE_MINT } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { findFaucetAddressSync } from "@/actions/faucet";
import { getCurrentEpoch } from "@/lib/Token";

import { connectionBatcher } from "./accounts";
import { useBalance } from "./token";
import { useReadFaucetProgram } from "./useProgram";

function parseFutureDate(futureDate: Date) {
  const now = Date.now();
  const future = futureDate.getTime();

  // Ensure the future date is indeed in the future
  if (future <= now) {
    return "Ended";
  }

  let delta = Math.floor((future - now) / 1000);

  const days = Math.floor(delta / (24 * 3600));
  delta = delta % (24 * 3600);

  const hours = Math.floor(delta / 3600);
  delta = delta % 3600;

  const minutes = Math.floor(delta / 60);
  const seconds = delta % 60;

  // Format each unit with leading zeros if needed
  const h = String(hours).padStart(2, "0");
  const m = String(minutes).padStart(2, "0");
  const s = String(seconds).padStart(2, "0");

  return `${days}D ${h}:${m}:${s}`;
}

export const useEpochCountdown = () => {
  const [counter, setCounter] = useState(parseFutureDate(getCurrentEpoch()));
  useEffect(() => {
    const id = setInterval(() => {
      setCounter(parseFutureDate(getCurrentEpoch()));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return counter;
};

export const useCompetitionAccount = (epoch: Date) => {
  const { connection } = useConnection();
  const program = useReadFaucetProgram();

  const competition = findFaucetAddressSync("competition", epoch);

  return useQuery({
    queryKey: ["competition", epoch.toISOString()],
    enabled: !!program,
    queryFn: () =>
      connectionBatcher(connection)
        .fetch(competition)
        .then((info) => {
          if (info === null) {
            return null;
          }
          const coder = program!.account.competition.coder;
          const account = coder.accounts.decode("competition", info!.data);
          return {
            address: competition,
            total: BigInt(account.total.toString()),
            bump: account.bump,
          };
        }),
  });
};

export const usePrizePool = (epoch: Date) => {
  const tokenAccount = findFaucetAddressSync("vault", NATIVE_MINT, epoch);
  const { data: balance } = useBalance(
    NATIVE_MINT.toString() as Address,
    new PublicKey(tokenAccount),
  );
  const { data: competition } = useCompetitionAccount(epoch);
  return { data: competition ? competition.total : balance };
};
