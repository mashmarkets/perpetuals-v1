import "@/styles/globals.css";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
// import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AppProps } from "next/app";
import { Inter } from "next/font/google";
import React, { FC, ReactNode, useMemo, useState } from "react";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import { Navbar } from "@/components/Navbar";

import "@/styles/wallet-adapter.css";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { CurrentEpochProvider } from "@/hooks/competition";
import { persister, queryClient } from "@/utils/queryClient";

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ["latin"] });

// Call window.toggleDevtools() to lazy load devtools in production
// https://tanstack.com/query/latest/docs/framework/react/devtools#devtools-in-production
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import("@tanstack/react-query-devtools/build/modern/production.js").then(
    (d) => ({
      default: d.ReactQueryDevtools,
    }),
  ),
);

const ReactQueryProvider = ({ children }: { children: ReactNode }) => {
  const [showDevtools, setShowDevtools] = useState(false);
  React.useEffect(() => {
    // @ts-expect-error -- Allow toggling of devtools
    window.toggleDevtools = () => setShowDevtools((old) => !old);
  }, []);
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
      {showDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtoolsProduction />
        </React.Suspense>
      )}
    </PersistQueryClientProvider>
  );
};

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <CurrentEpochProvider>
      <ReactQueryProvider>
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
            theme="dark"
            className="mt-12"
          />
          <Navbar />
          <Component {...pageProps} />
        </Context>
      </ReactQueryProvider>
    </CurrentEpochProvider>
  );
}

const Context: FC<{ children: ReactNode }> = ({ children }) => {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  // const endpoint = useMemo(() => "http://localhost:8899");

  const wallets = useMemo(
    () => [
      // new PhantomWalletAdapter(),
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
    <div className={`min-h-screen bg-black pt-14 ${inter.className}`}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
};
