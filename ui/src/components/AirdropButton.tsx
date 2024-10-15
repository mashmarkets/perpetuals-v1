import { BN } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { toast } from "react-toastify";
import { createMintToInstruction } from "src/actions/faucet";

import { getAllUserData } from "@/hooks/storeHelpers/fetchUserData";
import { CustodyAccount } from "@/lib/CustodyAccount";
import { getTokenLabel, tokens } from "@/lib/Token";
import { useGlobalStore } from "@/stores/store";
import { sendSignedTransactionAndNotify } from "@/utils/TransactionHandlers";

import { SolidButton } from "./SolidButton";

interface Props {
  className?: string;
  custody: CustodyAccount;
}

export default function AirdropButton(props: Props) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  let mint = props.custody.mint;

  const poolData = useGlobalStore((state) => state.poolData);
  const setUserData = useGlobalStore((state) => state.setUserData);

  async function handleAirdrop() {
    if (!publicKey) return;
    if (mint.toString() === "So11111111111111111111111111111111111111112") {
      await connection.requestAirdrop(publicKey!, 5 * 10 ** 9);
    } else {
      const {
        decimals,
        extensions: { mainnet, faucet },
      } = tokens[mint.toString()]!;

      let transaction = new Transaction();
      transaction = transaction.add(
        createMintToInstruction({
          payer: publicKey,
          seed: new PublicKey(mainnet),
          amount: new BN(faucet).mul(new BN(10 ** decimals)),
        }),
      );
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash("finalized")
      ).blockhash;

      transaction = await signTransaction!(transaction);

      await sendSignedTransactionAndNotify({
        connection,
        transaction,
        successMessage: "Transaction success!",
        failMessage: "Failed to airdrop",
        signTransaction: () => {},
        enableSigning: false,
      });
    }

    const userData = await getAllUserData(connection, publicKey!, poolData);
    setUserData(userData);
  }

  // if (props.custody.getTokenE() === TokenE.USDC) {
  //   return (
  //     <a
  //       target="_blank"
  //       rel="noreferrer"
  //       href={"https://spl-token-faucet.com/?token-name=USDC-Dev"}
  //     >
  //       <SolidButton className="my-6 w-full bg-slate-500 hover:bg-slate-200">
  //         Airdrop {'"'}
  //         {getTokenLabel(props.custody.mint)}
  //         {'"'}
  //       </SolidButton>
  //     </a>
  //   );
  // }

  return (
    <SolidButton
      className="my-6 w-full bg-slate-500 hover:bg-slate-200"
      onClick={handleAirdrop}
    >
      Airdrop {'"'}
      {getTokenLabel(props.custody.mint)}
      {'"'}
    </SolidButton>
  );
}
