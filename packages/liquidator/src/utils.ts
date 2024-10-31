import { PublicKey } from "@solana/web3.js";
import axios from "axios";
import { throttle } from "lodash-es";

import { env } from "./env.js";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function sendTelegramMessage(
  message: string,
  parseMode?: string,
): Promise<void> {
  console.log("TG: ", message);
  await axios({
    timeout: 10_000,
    method: "POST",
    url: `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`,
    data: { chat_id: env.TG_CHAT_ID, text: message, parse_mode: parseMode },
  }).catch((error) => {
    console.log("Error sending TG Message");
    console.log(error);
  });
} // health check

const sendNotification = (message: string) => {
  console.log(message);
  if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
    sendTelegramMessage(message);
  }
};

export const notify = throttle(sendNotification, 1000 * 40, { leading: true });

export const getProgramIdFromUrl = async (url: string) => {
  try {
    const { data } = await axios.get(url);
    const address = data?.metadata?.address;
    return new PublicKey(address);
  } catch {
    return undefined;
  }
};
