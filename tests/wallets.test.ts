import { beforeEach, describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";

/**
 * A tiny in-memory stand-in for the Neon tagged-template client, modelling just
 * enough of `wallets` to prove the provisioning contract: one row per
 * (user, chain, network) and a stable address under concurrent requests.
 */
const store = { wallets: [] as Record<string, unknown>[], seq: 0 };

function reset() {
  store.wallets = [];
  store.seq = 0;
}

vi.mock("@/lib/db", () => {
  const sql: unknown = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join(" ? ").replace(/\s+/g, " ").trim().toLowerCase();
    const rows = store.wallets;

    if (text.startsWith("insert into wallets")) {
      // Placeholders only: `status` is a literal 'active' in the statement.
      const [user_id, chain, network, provider, address, enc_secret, enc_iv, enc_tag, key_version] =
        values as string[];
      const clash = rows.some(
        (r) => r.user_id === user_id && r.chain === chain && r.network === network
      );
      if (!clash) {
        rows.push({
          id: `wallet-${++store.seq}`,
          user_id,
          chain,
          network,
          provider,
          address,
          provider_wallet_id: null,
          status: "active",
          enc_secret,
          enc_iv,
          enc_tag,
          key_version,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          balance_synced_at: null,
        });
      }
      return Promise.resolve([]);
    }

    if (text.includes("order by chain")) {
      const [user_id] = values as string[];
      return Promise.resolve(rows.filter((r) => r.user_id === user_id));
    }

    if (text.startsWith("select * from wallets where user_id")) {
      const [user_id, chain, network] = values as string[];
      return Promise.resolve(
        rows.filter((r) => r.user_id === user_id && r.chain === chain && r.network === network).slice(0, 1)
      );
    }

    if (text.includes("update wallets set balance_synced_at")) {
      return Promise.resolve([]);
    }
    if (text.includes("update wallets set status = 'failed'")) {
      return Promise.resolve([]);
    }
    return Promise.resolve([]);
  };
  (sql as { query: () => Promise<unknown[]> }).query = () => Promise.resolve([]);
  return { db: () => sql, databaseConfigured: true };
});

const { ensureAllWallets, ensureWallet, listWallets, signingSecret } = await import(
  "@/lib/chain/wallets"
);

beforeEach(() => reset());

describe("stellar provisioning", () => {
  it("creates one wallet with a valid address and a decryptable secret", async () => {
    const wallet = await ensureWallet("user-1", "stellar");
    expect(wallet.chain).toBe("stellar");
    expect(wallet.network).toBe("testnet");
    expect(Keypair.fromPublicKey(wallet.address).publicKey()).toBe(wallet.address);
    // The stored secret is sealed, and unsealing it gives back a working keypair.
    expect(wallet.enc_secret).toBeTruthy();
    const secret = signingSecret(wallet);
    // What is stored is ciphertext, never the signing seed itself.
    expect(wallet.enc_secret).not.toContain(secret);
    expect(wallet.enc_secret).not.toBe(secret);
    expect(secret).toMatch(/^S[A-Z2-7]{55}$/);
    expect(Keypair.fromSecret(secret).publicKey()).toBe(wallet.address);
  });

  it("returns the same wallet on repeat calls", async () => {
    const first = await ensureWallet("user-1", "stellar");
    const second = await ensureWallet("user-1", "stellar");
    expect(second.id).toBe(first.id);
    expect(second.address).toBe(first.address);
    expect(store.wallets).toHaveLength(1);
  });

  it("does not create conflicting rows under concurrent provisioning", async () => {
    const results = await Promise.all([
      ensureWallet("user-2", "stellar"),
      ensureWallet("user-2", "stellar"),
      ensureWallet("user-2", "stellar"),
    ]);
    expect(store.wallets).toHaveLength(1);
    const addresses = new Set(results.map((r) => r.address));
    expect(addresses.size).toBe(1);
  });

  it("gives different users different wallets", async () => {
    const a = await ensureWallet("user-a", "stellar");
    const b = await ensureWallet("user-b", "stellar");
    expect(a.address).not.toBe(b.address);
  });
});

describe("evm provisioning", () => {
  it("creates a valid 0x address", async () => {
    const wallet = await ensureWallet("user-3", "evm");
    expect(wallet.chain).toBe("evm");
    expect(wallet.network).toBe("sepolia");
    expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(signingSecret(wallet)).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe("ensureAllWallets", () => {
  it("provisions both chains and keeps one row per chain", async () => {
    const { provisioned, failed } = await ensureAllWallets("user-4");
    expect(failed).toHaveLength(0);
    expect(provisioned.map((w) => w.chain).sort()).toEqual(["evm", "stellar"]);
    await ensureAllWallets("user-4");
    expect(store.wallets).toHaveLength(2);
    expect(await listWallets("user-4")).toHaveLength(2);
  });
});
