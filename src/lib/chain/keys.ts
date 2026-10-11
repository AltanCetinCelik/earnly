import { Keypair } from "@stellar/stellar-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

/**
 * Keypair generation only. Kept apart from the wallet store so the Stellar and
 * EVM services can create keys without importing the database layer.
 */

export interface GeneratedKeypair {
  address: string;
  /** Signing secret. Never persisted as-is: it is sealed before it reaches Neon. */
  secret: string;
}

/** Stellar ed25519 keypair. Address is the G… public key, secret the S… seed. */
export function generateStellarKeypair(): GeneratedKeypair {
  const keypair = Keypair.random();
  return { address: keypair.publicKey(), secret: keypair.secret() };
}

/** EVM secp256k1 keypair, derived the same way viem derives an account. */
export function generateEvmKeypair(): GeneratedKeypair {
  const secret = generatePrivateKey();
  return { address: privateKeyToAccount(secret).address, secret };
}

export function generateKeypairFor(chain: "stellar" | "evm"): GeneratedKeypair {
  return chain === "stellar" ? generateStellarKeypair() : generateEvmKeypair();
}
