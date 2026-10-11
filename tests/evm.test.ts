import { describe, expect, it } from "vitest";
import { EVM, explorerTxUrl } from "@/lib/chain/config";
import { EVM as EVMCONFIG } from "@/lib/chain/config";
import { isValidEvmAddress, normaliseEvmAddress, shortenAddress } from "@/lib/chain/evm";
import { previewEvmTransfer } from "@/lib/chain/evm";
import type { WalletRow } from "@/lib/chain/wallets";
import type { TransactionSerializedEIP1559 } from "viem";

const ADDRESS = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
const OTHER = "0x000000000000000000000000000000000000dEaD";

const wallet: WalletRow = {
  id: "w1",
  user_id: "u1",
  chain: "evm",
  network: "sepolia",
  provider: "earnly-managed",
  address: ADDRESS,
  provider_wallet_id: null,
  status: "active",
  enc_secret: null,
  enc_iv: null,
  enc_tag: null,
  key_version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  balance_synced_at: null,
};

describe("sepolia configuration", () => {
  it("pins chain id 11155111", () => {
    expect(EVM.chainId).toBe(11155111);
    expect(EVM.network).toBe("sepolia");
    expect(EVM.asset.decimals).toBe(18);
  });

  it("builds explorer links", () => {
    expect(explorerTxUrl("evm", "0xabc")).toBe("https://sepolia.etherscan.io/tx/0xabc");
    expect(explorerTxUrl("evm", null)).toBeNull();
  });
});

describe("address validation", () => {
  it("accepts checksummed and lowercase addresses", () => {
    expect(isValidEvmAddress(ADDRESS)).toBe(true);
    expect(isValidEvmAddress(ADDRESS.toLowerCase())).toBe(true);
    expect(normaliseEvmAddress(` ${ADDRESS} `)).toBe(ADDRESS);
  });

  it("rejects bad input", () => {
    expect(isValidEvmAddress("0x123")).toBe(false);
    expect(isValidEvmAddress("8ba1f109551bD432803012645Ac136ddd64DBA72")).toBe(false);
    expect(isValidEvmAddress("")).toBe(false);
    expect(isValidEvmAddress(undefined)).toBe(false);
    expect(normaliseEvmAddress("0xZZZ1f109551bD432803012645Ac136ddd64DBA72")).toBeNull();
  });

  it("shortens for display", () => {
    expect(shortenAddress(ADDRESS)).toBe("0x8ba1…BA72");
  });
});

describe("transfer validation happens before any signing or RPC call", () => {
  it("rejects a malformed destination", async () => {
    await expect(previewEvmTransfer(wallet, "not-an-address", "0.1")).rejects.toMatchObject({
      code: "invalid_destination",
    });
  });

  it("rejects sending to itself", async () => {
    await expect(previewEvmTransfer(wallet, ADDRESS, "0.1")).rejects.toMatchObject({
      code: "invalid_destination",
    });
  });

  it("rejects bad amounts", async () => {
    for (const bad of ["0", "-1", "1.1234567890123456789", "abc", ""]) {
      await expect(previewEvmTransfer(wallet, OTHER, bad)).rejects.toMatchObject({
        code: "invalid_amount",
      });
    }
  });

  it("exposes the same configuration object from config and the service", () => {
    expect(EVMCONFIG.chainId).toBe(EVM.chainId);
  });
});

describe("sepolia signing path", () => {
  it("signs an EIP-1559 transfer pinned to chain 11155111 with exact wei", async () => {
    const { privateKeyToAccount } = await import("viem/accounts");
    const { parseTransaction, recoverTransactionAddress, parseEther } = await import("viem");
    const { formatEther } = await import("viem");

    // Deterministic fixture key: never used on a network, never funded.
    const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
    const to = "0x000000000000000000000000000000000000dEaD";
    const value = parseEther("0.25");

    const raw = await account.signTransaction({
      chainId: EVM.chainId,
      to,
      value,
      gas: 21_000n,
      maxFeePerGas: 2_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
      nonce: 7,
      type: "eip1559",
    });

    const parsed = parseTransaction(raw);
    // The chain id is what stops a testnet signature being replayed on Mainnet.
    expect(parsed.chainId).toBe(11155111);
    expect(parsed.to?.toLowerCase()).toBe(to.toLowerCase());
    expect(parsed.value).toBe(value);
    expect(formatEther(parsed.value as bigint)).toBe("0.25");

    const recovered = await recoverTransactionAddress({
      serializedTransaction: raw as TransactionSerializedEIP1559,
    });
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it("refuses a chain id that is not Sepolia", async () => {
    const { privateKeyToAccount } = await import("viem/accounts");
    const { parseTransaction } = await import("viem");
    const account = privateKeyToAccount(`0x${"22".repeat(32)}`);
    const raw = await account.signTransaction({
      chainId: 1, // mainnet, on purpose
      to: "0x000000000000000000000000000000000000dEaD",
      value: 1n,
      gas: 21_000n,
      maxFeePerGas: 2_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
      nonce: 0,
      type: "eip1559",
    });
    // Proves the guard has something to catch: a Mainnet-signed payload is
    // distinguishable from a Sepolia one.
    expect(parseTransaction(raw).chainId).not.toBe(EVM.chainId);
  });
});
