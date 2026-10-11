import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Server-only envelope encryption for wallet key material.
 *
 * Custody model (documented in docs/wallet-integration.md): the wallet is
 * server-managed while no managed signing provider is configured. Signing
 * secrets are never stored in plaintext, never returned by an API and never
 * sent to the browser; they exist in memory only for the duration of a signing
 * operation.
 *
 *   master key (env: WALLET_MASTER_KEY)
 *        │  HKDF-SHA256, salt = wallet id, info = chain+network
 *        ▼
 *   per-wallet data key ── AES-256-GCM ──► ciphertext + iv + tag (Neon)
 *
 * Rotating `WALLET_MASTER_KEY` invalidates existing ciphertext, so a rotation
 * is a migration (decrypt with the old key, re-encrypt with the new one). The
 * `key_version` column on `wallets` exists for exactly that.
 */

const ALGO = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;

export type SealedSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: number;
};

export const CURRENT_KEY_VERSION = 1;

function decodeKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const value = raw.trim();
  const isHex = /^[0-9a-fA-F]{64}$/.test(value);
  const buf = isHex ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (buf.length !== KEY_BYTES) return null;
  return buf;
}

export function walletCryptoConfigured(): boolean {
  return decodeKey(process.env.WALLET_MASTER_KEY) !== null;
}

export function assertWalletCryptoConfigured(): Buffer {
  const key = decodeKey(process.env.WALLET_MASTER_KEY);
  if (!key) {
    throw new WalletCryptoError(
      "WALLET_MASTER_KEY is not set (or is not 32 bytes). Generate one with " +
        "`openssl rand -base64 32` and set it in the environment. Stored wallet " +
        "keys cannot be decrypted without it."
    );
  }
  return key;
}

export class WalletCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletCryptoError";
  }
}

/** Per-wallet key, so one leaked data key cannot open another wallet. */
export function deriveWalletKey(context: string): Buffer {
  const master = assertWalletCryptoConfigured();
  const derived = hkdfSync("sha256", master, Buffer.from("earnly:wallets:v1"), Buffer.from(context), KEY_BYTES);
  return Buffer.from(derived);
}

export function sealSecret(secret: string, context: string): SealedSecret {
  const key = deriveWalletKey(context);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    keyVersion: CURRENT_KEY_VERSION,
  };
}

export function openSecret(sealed: SealedSecret, context: string): string {
  const key = deriveWalletKey(context);
  const iv = Buffer.from(sealed.iv, "base64");
  const tag = Buffer.from(sealed.tag, "base64");
  if (iv.length !== IV_BYTES || tag.length !== 16) {
    throw new WalletCryptoError("Stored wallet secret is malformed.");
  }
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([
      decipher.update(Buffer.from(sealed.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // GCM tag mismatch: wrong key version, tampered row, or rotated master key.
    throw new WalletCryptoError("Stored wallet secret failed integrity verification.");
  }
}

/**
 * Constant-time comparison helper used when matching a caller-supplied value
 * (for example an idempotency key) against a stored one.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
