import { Address } from "@solana/addresses";
import { NATIVE_MINT } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { findFaucetAddressSync } from "@/actions/faucet";
import { getCompetitionMint, getCurrentEpoch } from "@/lib/Token";

import { connectionBatcher } from "./accounts";
import { useBalance } from "./token";
import { useReadFaucetProgram } from "./useProgram";

function getCountdown(date: Date) {
  const now = Math.ceil(Date.now() / 1000) * 1000;
  const epoch = date.getTime();

  // Ensure the future date is indeed in the future
  if (now >= epoch) {
    return "Ended";
  }

  let delta = Math.floor((epoch - now) / 1000);

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

const CurrentEpochContext = createContext<Date>(getCurrentEpoch());

// We need a global value of epoch to keep everything in sync
export const CurrentEpochProvider = ({ children }: { children: ReactNode }) => {
  const [epoch, setEpoch] = useState(getCurrentEpoch());

  useEffect(() => {
    const id = setInterval(() => {
      setEpoch(getCurrentEpoch());
    }, 500);

    return () => clearInterval(id);
  }, []);

  return (
    <CurrentEpochContext.Provider value={epoch}>
      {children}
    </CurrentEpochContext.Provider>
  );
};

export const useCurrentEpoch = () => {
  return useContext(CurrentEpochContext);
};

export const useCompetitionMint = () => {
  const epoch = useCurrentEpoch();
  return getCompetitionMint(epoch);
};

export const useEpochCountdown = () => {
  const epoch = useCurrentEpoch();
  const [countdown, setCountdown] = useState(getCountdown(epoch));

  // For some reason doesn't work passing in Date object
  const ms = epoch.getTime();
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(() => getCountdown(new Date(ms)));
    }, 500);

    return () => clearInterval(id);
  }, [ms]);

  return countdown;
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
