// Consolidate used environment variables here
export const env = {
  HEALTHCHECKS_URL: process.env.HEALTHCHECKS_URL,
  PERPETUALS_IDL_URL: process.env.PERPETUALS_IDL_URL,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  RPC_ENDPOINT: process.env.RPC_ENDPOINT ?? "https://api.devnet.solana.com",
  TG_BOT_TOKEN: process.env.TG_BOT_TOKEN,
  TG_CHAT_ID: process.env.TG_CHAT_ID,
};
