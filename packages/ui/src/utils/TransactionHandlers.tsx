import { WalletSignTransactionError } from "@solana/wallet-adapter-base";
import {
  Connection,
  SendTransactionError,
  TransactionConfirmationStrategy,
  TransactionSignature,
} from "@solana/web3.js";
import { toast } from "react-toastify";

export const TRX_URL = (txid: string) =>
  `https://solana.fm/tx/${txid}?cluster=devnet-solana`;

export const ACCOUNT_URL = (address: string) =>
  `https://solana.fm/address/${address}?cluster=devnet-solana`;

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const wrapTransactionWithNotification = async (
  connection: Connection,
  p: Promise<TransactionConfirmationStrategy | TransactionSignature>,
  messages: {
    pending?: string;
    success?: string;
    error?: string;
  } = {
    pending: "Transaction pending",
    success: "Transaction confirmed",
    error: "Transaction Failed",
  },
) => {
  // There is "two" steps to the promise. First the transaction needs to be broadcasted, then we need to confirm it.
  let signature: string | undefined = undefined;

  const Link = () => {
    if (signature === undefined) {
      return null;
    }
    return (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={`${TRX_URL(signature)}`}
        className="text-blue-500"
      >
        {" "}
        View on explorer
      </a>
    );
  };

  await toast.promise(
    p.then((tx) => {
      signature = typeof tx === "string" ? tx : tx.signature;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Can't get with to work with the union type
      return connection.confirmTransaction(tx as any);
    }),
    {
      pending: {
        render() {
          return (
            <div>
              <h2>{messages.pending}</h2>
              <Link />
            </div>
          );
        },
      },
      success: {
        render() {
          return (
            <div>
              <div>
                <span className="icon green">
                  <span
                    className="iconify"
                    data-icon="teenyicons:tick-circle-solid"
                  ></span>
                </span>
              </div>
              <div>
                <h2>{messages.success}</h2>
                <Link />
              </div>
            </div>
          );
        },
        icon: false,
      },
      error: {
        render({ data }) {
          if (data instanceof WalletSignTransactionError) {
            return "Rejected by user";
          }
          // When the promise reject, data will contains the error
          console.log("Transaction failed with: ", data);
          let message = messages.error;
          if (
            data instanceof SendTransactionError &&
            data.message.includes("Transaction simulation failed")
          ) {
            const m = JSON.stringify(data.logs).match(
              /Error Message\: ([\w ]+)/,
            )?.[1];
            message = "Simulation failed" + (m ? `: ${m}` : "");
          }
          return (
            <div>
              <div>
                <span className="icon red">
                  <span
                    className="iconify"
                    data-icon="akar-icons:circle-x-fill"
                  ></span>
                </span>
              </div>
              <div>
                <h2>
                  {message}
                  {/* {JSON.stringify(data?.message ?? {}).includes("timed")
                      ? data.message
                      : failMessage} */}
                </h2>
                <Link />
              </div>
            </div>
          );
        },
        icon: false,
      },
    },
  );

  return signature;
};
