import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Deterministic wallet-key config for the crypto and provisioning suites.
    env: {
      WALLET_MASTER_KEY: "ZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWU=",
    },
    restoreMocks: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
