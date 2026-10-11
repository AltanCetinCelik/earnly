import { describe, expect, it } from "vitest";
import {
  WalletCryptoError,
  deriveWalletKey,
  openSecret,
  safeEqual,
  sealSecret,
  walletCryptoConfigured,
} from "@/lib/chain/crypto";

describe("wallet key custody", () => {
  it("reports the master key as configured in the test environment", () => {
    expect(walletCryptoConfigured()).toBe(true);
  });

  it("seals and opens a Stellar-style secret", () => {
    const secret = "SBGVOLWQ7VYPQZ5YQPJPQZ5YQPJPQZ5YQPJPQZ5YQPJPQZ5YQPJPQZ5YQ";
    const sealed = sealSecret(secret, "stellar:testnet:user-1");
    expect(sealed.ciphertext).not.toContain(secret);
    expect(sealed.iv).toBeTruthy();
    expect(sealed.tag).toBeTruthy();
    expect(openSecret(sealed, "stellar:testnet:user-1")).toBe(secret);
  });

  it("produces a different ciphertext every time (random IV)", () => {
    const a = sealSecret("same-plaintext", "evm:sepolia:user-1");
    const b = sealSecret("same-plaintext", "evm:sepolia:user-1");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it("refuses to open a secret under another wallet's context", () => {
    const sealed = sealSecret("secret", "stellar:testnet:user-1");
    expect(() => openSecret(sealed, "stellar:testnet:user-2")).toThrow(WalletCryptoError);
  });

  it("detects tampering with the ciphertext", () => {
    const sealed = sealSecret("secret", "stellar:testnet:user-1");
    const flipped = Buffer.from(sealed.ciphertext, "base64");
    flipped[0] ^= 0xff;
    expect(() =>
      openSecret({ ...sealed, ciphertext: flipped.toString("base64") }, "stellar:testnet:user-1")
    ).toThrow(WalletCryptoError);
  });

  it("derives a different data key per context", () => {
    const a = deriveWalletKey("stellar:testnet:user-1");
    const b = deriveWalletKey("stellar:testnet:user-2");
    expect(a.equals(b)).toBe(false);
    expect(a.length).toBe(32);
  });

  it("safeEqual compares without short-circuiting", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
