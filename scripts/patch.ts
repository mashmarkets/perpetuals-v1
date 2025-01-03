import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Keypair } from "@solana/web3.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Inject into the IDL ourselves (doesn't seem to work for perpetuals)
function patch(program: string, instance: "types" | "idl") {
  // Read the file
  const file = path.join(
    __dirname,
    `../target/${instance}/${program.toLowerCase()}.${instance === "types" ? "ts" : "json"}`,
  );

  let content = fs.readFileSync(file, "utf8");
  if (!content.includes('"address": ""')) {
    return;
  }

  const address = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(
          path.join(
            __dirname,
            `../target/deploy/${program.toLowerCase()}-keypair.json`,
          ),
          "utf-8",
        ),
      ),
    ),
  ).publicKey;

  // Add address to type definition
  content = content.replace('"address": ""', `"address": "${address}"`);

  // Write the changes back to file
  fs.writeFileSync(file, content);
}

patch("Perpetuals", "idl");
patch("Perpetuals", "types");
patch("Faucet", "idl");
patch("Faucet", "types");
