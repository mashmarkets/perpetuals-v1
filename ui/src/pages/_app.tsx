import "@/styles/globals.css";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  BackpackWalletAdapter,
  BraveWalletAdapter,
  CloverWalletAdapter,
  CoinbaseWalletAdapter,
  ExodusWalletAdapter,
  GlowWalletAdapter,
  HuobiWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolletWalletAdapter,
  SolongWalletAdapter,
  TorusWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AppProps } from "next/app";
import React, { FC, ReactNode, useMemo } from "react";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Navbar } from "@/components/Navbar";
import { useHydrateStore } from "@/hooks/useHydrateStore";

require("@solana/wallet-adapter-react-ui/styles.css");

const queryClient = new QueryClient();

const StoreUpdater = () => {
  useHydrateStore();
  return null;
};

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Context>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <Navbar />
        <StoreUpdater />
        <Component {...pageProps} />
      </Context>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

const Context: FC<{ children: ReactNode }> = ({ children }) => {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  // const endpoint = useMemo(() => "http://localhost:8899");

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      // new SlopeWalletAdapter(),
      // new TorusWalletAdapter(),
      // new LedgerWalletAdapter(),
      // new BackpackWalletAdapter(),
      // new BraveWalletAdapter(),
      // new CloverWalletAdapter(),
      // new CoinbaseWalletAdapter(),
      // new ExodusWalletAdapter(),
      // new GlowWalletAdapter(),
      // new HuobiWalletAdapter(),
      // new SolletWalletAdapter(),
      // new SolongWalletAdapter(),
      // new TrustWalletAdapter(),
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-black pt-14">
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
};
