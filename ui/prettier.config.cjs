// @ts-check

/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
module.exports = {
  // Since prettier 3.0, manually specifying plugins is required
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
  // This plugin's options
  importOrder: [
    "<BUILTIN_MODULES>", // Node.js built-in modules
    "vitest",
    "<THIRD_PARTY_MODULES>", // Imports not matched by other special words or groups.
    "",
    "^@/(.*)$",
    "",
    "^[./]",
  ],
  importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
  importOrderTypeScriptVersion: "5.0.0",
};
