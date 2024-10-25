const fs = require("fs");
const path = require("path");
const { Keypair } = require("@solana/web3.js");

// I'm so annoyed Anchor <0.30.0 doesn't populate address on build, so inject into the IDL ourselves
function patch(program: string) {
  // Read the file
  const file = path.join(
    __dirname,
    `../target/types/${program.toLowerCase()}.ts`,
  );

  let content = fs.readFileSync(file, "utf8");
  if (content.includes("metadata")) {
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

  // Add metadata.address to type definition
  content = content.replace(
    `export type ${program} = {\n`,
    `export type ${program} = {\n  "metadata": {\n    "address": "${address}"\n  },\n`,
  );

  // Add metadata.address to IDL
  content = content.replace(
    `export const IDL: ${program} = {\n`,
    `export const IDL: ${program} = {\n  "metadata": {\n    "address": "${address}"\n  },\n`,
  );

  // Write the changes back to file
  fs.writeFileSync(file, content);
}

patch("Perpetuals");
patch("Simulator");
