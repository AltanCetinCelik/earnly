import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Authorization contract for the wallet API.
 *
 * Every route must resolve the user from the session and ignore anything the
 * client sends about identity. These tests assert that directly, plus the
 * two-phase confirmation rule that stops an unconfirmed payment from being signed.
 */

const wallets = { ensureWallet: vi.fn(), listWallets: vi.fn(), publicWallet: vi.fn((w) => w) };
const stellar = {
  previewPayment: vi.fn(),
  sendPayment: vi.fn(),
  StellarError: class StellarError extends Error {
    code: string;
    retryable: boolean;
    constructor(code: string, message: string, retryable = false) {
      super(message);
      this.code = code;
      this.retryable = retryable;
    }
  },
};

vi.mock("@/lib/db", () => ({ databaseConfigured: true, db: () => vi.fn() }));
vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/chain/wallets", () => wallets);
vi.mock("@/lib/chain/stellar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/chain/stellar")>();
  return {
    ...actual,
    previewPayment: stellar.previewPayment,
    sendPayment: stellar.sendPayment,
    StellarError: stellar.StellarError,
  };
});
vi.mock("@/lib/chain/config", async (importOriginal) => importOriginal());

const { getSession } = await import("@/lib/session");
const walletIndex = await import("@/app/api/wallet/route");
const stellarSend = await import("@/app/api/wallet/stellar/send/route");

const CUSTOMER = {
  id: "user-a",
  email: "a@example.com",
  name: "A",
  avatar: null,
  profile: null,
  skills: [],
  providers: ["google"],
};

function post(body: unknown): Request {
  return new Request("https://earnly.test/api/wallet/stellar/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(getSession).mockReset();
  wallets.ensureWallet.mockReset().mockResolvedValue({
    id: "w1",
    user_id: "user-a",
    chain: "stellar",
    network: "testnet",
    provider: "earnly-managed",
    address: "G".repeat(56),
    provider_wallet_id: null,
    status: "active",
    enc_secret: "x",
    enc_iv: "y",
    enc_tag: "z",
    key_version: 1,
    created_at: "",
    updated_at: "",
    balance_synced_at: null,
  });
  wallets.listWallets.mockReset().mockResolvedValue([]);
  stellar.previewPayment.mockReset();
  stellar.sendPayment.mockReset();
});

describe("unauthenticated access", () => {
  it("refuses the wallet index", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const response = await walletIndex.GET();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "unauthorized" });
  });

  it("refuses a payment", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const response = await stellarSend.POST(post({ mode: "submit", confirm: true }));
    expect(response.status).toBe(401);
    expect(stellar.sendPayment).not.toHaveBeenCalled();
  });

  it("refuses to load anything when wallet keys are not configured", async () => {
    vi.mocked(getSession).mockResolvedValue(CUSTOMER);
    vi.stubEnv("WALLET_MASTER_KEY", "");
    const response = await walletIndex.GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "unconfigured" });
    vi.unstubAllEnvs();
  });
});

describe("identity comes from the session, never the request body", () => {
  it("ignores a client-supplied user id on submit", async () => {
    vi.mocked(getSession).mockResolvedValue(CUSTOMER);
    stellar.sendPayment.mockResolvedValue({
      status: "success",
      hash: "abc",
      ledger: 5,
      amount: "1",
      destination: "G".repeat(56),
      explorerUrl: "https://example.test/tx/abc",
      message: "ok",
      createdAt: new Date().toISOString(),
    });

    const response = await stellarSend.POST(
      post({
        mode: "submit",
        confirm: true,
        userId: "user-b",
        walletId: "someone-elses-wallet",
        destination: "G".repeat(56),
        amount: "1",
      })
    );

    expect(response.status).toBe(200);
    expect(stellar.sendPayment).toHaveBeenCalledTimes(1);
    expect(stellar.sendPayment.mock.calls[0][0]).toMatchObject({
      userId: "user-a",
      destination: "G".repeat(56),
      amount: "1",
    });
  });

  it("binds previews to the session user's own wallet", async () => {
    vi.mocked(getSession).mockResolvedValue(CUSTOMER);
    stellar.previewPayment.mockResolvedValue({ amount: "1" });

    await stellarSend.POST(post({ mode: "preview", destination: "G".repeat(56), amount: "1" }));

    expect(wallets.ensureWallet).toHaveBeenCalledWith("user-a", "stellar");
    expect(stellar.sendPayment).not.toHaveBeenCalled();
  });
});

describe("confirmation gate", () => {
  it("will not sign without an explicit confirmation", async () => {
    vi.mocked(getSession).mockResolvedValue(CUSTOMER);
    const response = await stellarSend.POST(
      post({ mode: "submit", destination: "G".repeat(56), amount: "1" })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "confirmation_required" });
    expect(stellar.sendPayment).not.toHaveBeenCalled();
  });

  it("rejects an unknown mode", async () => {
    vi.mocked(getSession).mockResolvedValue(CUSTOMER);
    const response = await stellarSend.POST(post({ mode: "execute" }));
    expect(response.status).toBe(400);
    expect(stellar.sendPayment).not.toHaveBeenCalled();
  });

  it("surfaces a validation error from the service without signing", async () => {
    vi.mocked(getSession).mockResolvedValue(CUSTOMER);
    stellar.sendPayment.mockRejectedValue(
      new stellar.StellarError("insufficient_balance", "Not enough spendable XLM.", false)
    );
    const response = await stellarSend.POST(
      post({ mode: "submit", confirm: true, destination: "G".repeat(56), amount: "999999" })
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ code: "insufficient_balance" });
  });
});
