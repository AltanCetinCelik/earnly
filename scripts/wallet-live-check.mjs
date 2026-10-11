#!/usr/bin/env node
/**
 * Live end-to-end check for the Earnly wallet integration.
 *
 * Unlike the unit suite, this talks to the real running app, the real Neon
 * database and the real Stellar Testnet / Sepolia endpoints. It is opt-in:
 *
 *   npm run dev                                  # in another terminal
 *   npm run wallet:live-check
 *
 * It creates two throwaway users, mints real session cookies for them, funds
 * both Stellar accounts from Friendbot, sends a real XLM payment, then verifies
 * the result independently against Horizon. Test users are deleted at the end.
 */
import { createHmac, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const BASE = process.env.LIVE_BASE_URL || "http://127.0.0.1:3000";
const HORIZON = "https://horizon-testnet.stellar.org";
const url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
const secret = process.env.AUTH_SECRET;

if (!url || !secret) {
  console.error("DATABASE_URL and AUTH_SECRET must be set (run with --env-file=.env.local).");
  process.exit(1);
}

const sql = neon(url);
const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures += 1;
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Same format as src/lib/session.ts: base64url(body).hmac */
function sessionCookie(userId) {
  const body = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `earnly_session=${body}.${mac}`;
}

async function call(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 300) };
  }
  return { status: response.status, body: parsed };
}

async function horizon(path) {
  const response = await fetch(`${HORIZON}${path}`, { cache: "no-store" });
  if (!response.ok) return null;
  return response.json();
}

async function makeUser(label) {
  const email = `live-check-${label}-${randomUUID()}@earnly.test`;
  const rows = await sql`
    insert into users (email, email_verified, name)
    values (${email}, true, ${`Live check ${label}`})
    returning id
  `;
  const id = rows[0].id;
  await sql`
    insert into profiles (user_id, full_name, verification, onboarded)
    values (${id}, ${`Live check ${label}`}, 'verified', true)
  `;
  return { id, email };
}

async function main() {
  console.log(`\nEarnly wallet live check → ${BASE}\n${"-".repeat(64)}`);

  const health = await call("/api/health");
  check("app is reachable", health.status === 200, `HTTP ${health.status}`);
  if (health.status !== 200) return;

  const sender = await makeUser("sender");
  const recipient = await makeUser("recipient");
  const cookie = sessionCookie(sender.id);
  const recipientCookie = sessionCookie(recipient.id);
  const strangerCookie = sessionCookie(randomUUID());

  try {
    /* ---------------------------------------------------------- provisioning */
    const index = await call("/api/wallet", { cookie });
    check("authenticated user can open the wallet index", index.status === 200, `HTTP ${index.status}`);
    const wallets = index.body.wallets ?? [];
    check("both chains were provisioned", wallets.length === 2, wallets.map((w) => w.chain).join(", "));
    const stellarWallet = wallets.find((w) => w.chain === "stellar");
    const evmWallet = wallets.find((w) => w.chain === "evm");
    check("stellar address looks valid", /^G[A-Z2-7]{55}$/.test(stellarWallet?.address ?? ""));
    check("evm address looks valid", /^0x[0-9a-fA-F]{40}$/.test(evmWallet?.address ?? ""));
    check(
      "no signing material is exposed by the API",
      !JSON.stringify(index.body).match(/enc_secret|enc_iv|enc_tag|"secret"|privateKey/i)
    );

    const again = await call("/api/wallet", { cookie });
    check(
      "repeated provisioning returns the same addresses",
      again.body.wallets?.find((w) => w.chain === "stellar")?.address === stellarWallet.address &&
        again.body.wallets?.find((w) => w.chain === "evm")?.address === evmWallet.address
    );

    const unauth = await call("/api/wallet");
    check("unauthenticated access is refused", unauth.status === 401, `HTTP ${unauth.status}`);

    const stolen = await call("/api/wallet/stellar", { cookie: strangerCookie });
    const strangerRows = stolen.status === 200 ? stolen.body.wallet.address : null;
    check(
      "a different session cannot read another user's wallet",
      stolen.status !== 200 || strangerRows !== stellarWallet.address,
      `HTTP ${stolen.status}`
    );

    const unauthSend = await call("/api/wallet/stellar/send", {
      method: "POST",
      body: { mode: "submit", confirm: true, destination: recipient.id, amount: "1" },
    });
    check("unauthenticated signing is refused", unauthSend.status === 401, `HTTP ${unauthSend.status}`);

    /* ------------------------------------------------------ unfunded account */
    const before = await call("/api/wallet/stellar", { cookie });
    check("unfunded account reads as not active", before.body.account?.exists === false);
    check(
      "unfunded balance is reported as zero, not invented",
      before.body.account?.xlmBalance === "0",
      before.body.account?.xlmBalance
    );

    /* ------------------------------------------------------------ friendbot */
    const fund = await call("/api/wallet/stellar/fund", { method: "POST", cookie });
    check(
      "friendbot funds the testnet account",
      fund.status === 200 && ["funded", "already_funded"].includes(fund.body.status),
      `HTTP ${fund.status} ${fund.body.status ?? fund.body.error ?? ""}`
    );
    const recipientFund = await call("/api/wallet/stellar/fund", {
      method: "POST",
      cookie: recipientCookie,
    });
    check(
      "recipient account is funded too",
      recipientFund.status === 200,
      `HTTP ${recipientFund.status} ${recipientFund.body.status ?? ""}`
    );

    const recipientIndex = await call("/api/wallet", { cookie: recipientCookie });
    const recipientAddress = recipientIndex.body.wallets?.find((w) => w.chain === "stellar")?.address;

    const funded = await call("/api/wallet/stellar", { cookie });
    const fundedAccount = await horizon(`/accounts/${stellarWallet.address}`);
    check("funded account exists on Horizon", Boolean(fundedAccount));
    check(
      "dashboard balance matches Horizon",
      funded.body.account?.xlmBalance === fundedAccount?.balances?.find((b) => b.asset_type === "native")?.balance,
      `dashboard ${funded.body.account?.xlmBalance} vs horizon ${fundedAccount?.balances?.[0]?.balance}`
    );
    check(
      "spendable balance accounts for the reserve",
      Number(funded.body.account?.spendableXlm) < Number(funded.body.account?.xlmBalance)
    );

    /* ------------------------------------------------------------- payments */
    const overdraw = await call("/api/wallet/stellar/send", {
      method: "POST",
      cookie,
      body: { mode: "preview", destination: recipientAddress, amount: "99999999" },
    });
    check(
      "an over-balance payment is rejected before signing",
      overdraw.body.code === "insufficient_balance",
      overdraw.body.code ?? overdraw.body.error
    );

    const badAddress = await call("/api/wallet/stellar/send", {
      method: "POST",
      cookie,
      body: { mode: "preview", destination: "GABC", amount: "1" },
    });
    check("a malformed destination is rejected", badAddress.body.code === "invalid_destination");

    for (const bad of ["0", "-1", "1.12345678", "abc"]) {
      const response = await call("/api/wallet/stellar/send", {
        method: "POST",
        cookie,
        body: { mode: "preview", destination: recipientAddress, amount: bad },
      });
      check(`amount ${JSON.stringify(bad)} is rejected`, response.body.code === "invalid_amount");
    }

    const preview = await call("/api/wallet/stellar/send", {
      method: "POST",
      cookie,
      body: { mode: "preview", destination: recipientAddress, amount: "12.5", memo: "live-check" },
    });
    check("a valid payment previews", preview.status === 200, preview.body.error ?? "");

    const unconfirmed = await call("/api/wallet/stellar/send", {
      method: "POST",
      cookie,
      body: { mode: "submit", destination: recipientAddress, amount: "12.5" },
    });
    check(
      "an unconfirmed submit is refused",
      unconfirmed.body.code === "confirmation_required",
      unconfirmed.body.code
    );

    const idempotencyKey = `live-${randomUUID()}`;
    const send = await call("/api/wallet/stellar/send", {
      method: "POST",
      cookie,
      body: {
        mode: "submit",
        confirm: true,
        destination: recipientAddress,
        amount: "12.5",
        memo: "live-check",
        idempotencyKey,
      },
    });
    check(
      "a real XLM payment is accepted",
      send.status === 200 && send.body.outcome?.status === "success",
      `${send.body.outcome?.status ?? send.body.error} ${send.body.outcome?.hash ?? ""}`
    );
    const hash = send.body.outcome?.hash;
    check("a real transaction hash is returned", /^[0-9a-f]{64}$/.test(hash ?? ""), hash);

    /* ----------------------------------- independent verification at Horizon */
    const ledger = hash ? await horizon(`/transactions/${hash}`) : null;
    check("Horizon confirms the transaction", Boolean(ledger), ledger ? `ledger ${ledger.ledger}` : "not found");
    check(
      "the transaction is successful on the ledger",
      ledger?.successful === true,
      String(ledger?.successful)
    );
    const operations = hash ? await horizon(`/transactions/${hash}/operations`) : null;
    const paymentOp = operations?._embedded?.records?.find((op) => op.type === "payment");
    check(
      "the ledger shows the exact amount and destination",
      Number(paymentOp?.amount) === 12.5 && paymentOp?.to === recipientAddress,
      `${paymentOp?.amount} → ${paymentOp?.to}`
    );

    /* ------------------------------------------------ recipient sees the money */
    const recipientAfter = await call("/api/wallet/stellar", { cookie: recipientCookie });
    check(
      "the recipient balance reflects the payment",
      Number(recipientAfter.body.account?.xlmBalance) > 10000,
      recipientAfter.body.account?.xlmBalance
    );
    check(
      "the recipient history shows an incoming payment",
      (recipientAfter.body.activity ?? []).some((a) => a.txHash === hash && a.direction === "in")
    );

    const senderAfter = await call("/api/wallet/stellar", { cookie });
    check(
      "the sender history shows the outgoing payment as confirmed",
      (senderAfter.body.activity ?? []).some((a) => a.txHash === hash && a.status === "success")
    );

    /* --------------------------------------------------------- replay safety */
    const replay = await call("/api/wallet/stellar/send", {
      method: "POST",
      cookie,
      body: {
        mode: "submit",
        confirm: true,
        destination: recipientAddress,
        amount: "12.5",
        memo: "live-check",
        idempotencyKey,
      },
    });
    check(
      "replaying the same idempotency key does not send a second payment",
      replay.body.outcome?.hash === hash,
      replay.body.outcome?.hash
    );
    const afterReplay = await call("/api/wallet/stellar", { cookie: recipientCookie });
    check(
      "the recipient balance did not move on the replay",
      afterReplay.body.account?.xlmBalance === recipientAfter.body.account?.xlmBalance,
      afterReplay.body.account?.xlmBalance
    );
    const duplicateLedger = await horizon(`/transactions/${hash}`);
    check("exactly one ledger transaction exists for the hash", Boolean(duplicateLedger));

    /* --------------------------------------------------------- sepolia side */
    const evm = await call("/api/wallet/evm", { cookie });
    check("sepolia wallet loads", evm.status === 200, evm.body.error ?? `HTTP ${evm.status}`);
    check("sepolia chain id is 11155111", evm.body.network?.chainId === 11155111);
    check(
      "sepolia balance is read from the chain (not invented)",
      /^\d+$/.test(evm.body.account?.balanceWei ?? ""),
      `${evm.body.account?.balanceEth} ETH`
    );

    const evmBadTo = await call("/api/wallet/evm/send", {
      method: "POST",
      cookie,
      body: { mode: "preview", to: "not-an-address", amount: "0.01" },
    });
    check("a malformed evm destination is rejected", evmBadTo.body.code === "invalid_destination");

    const evmOverdraw = await call("/api/wallet/evm/send", {
      method: "POST",
      cookie,
      body: {
        mode: "preview",
        to: "0x000000000000000000000000000000000000dEaD",
        amount: "1",
      },
    });
    check(
      "an unfunded sepolia wallet refuses to send instead of faking success",
      evmOverdraw.body.code === "insufficient_balance",
      evmOverdraw.body.code ?? evmOverdraw.body.error
    );

    const evmUnconfirmed = await call("/api/wallet/evm/send", {
      method: "POST",
      cookie,
      body: { mode: "submit", to: "0x000000000000000000000000000000000000dEaD", amount: "0.01" },
    });
    check(
      "an unconfirmed sepolia submit is refused",
      evmUnconfirmed.body.code === "confirmation_required",
      evmUnconfirmed.body.code
    );

    /* ------------------------------------------------------------ stability */
    const stable = await call("/api/wallet", { cookie });
    check(
      "addresses are stable after all of the above",
      stable.body.wallets?.find((w) => w.chain === "stellar")?.address === stellarWallet.address &&
        stable.body.wallets?.find((w) => w.chain === "evm")?.address === evmWallet.address
    );

    const storedSecret = await sql`
      select count(*)::int as n from wallets
      where user_id = ${sender.id} and enc_secret is not null and enc_secret <> ''
    `;
    check("signing material is stored sealed, never in plaintext", storedSecret[0].n === 2, `${storedSecret[0].n} sealed secrets`);
  } finally {
    await sql`delete from users where id in (${sender.id}, ${recipient.id})`;
    console.log("\ntest users removed");
  }
}

main()
  .then(() => {
    console.log(`${"-".repeat(64)}\n${results.length - failures}/${results.length} checks passed`);
    process.exit(failures ? 1 : 0);
  })
  .catch((error) => {
    console.error("\nlive check crashed:", error);
    process.exit(1);
  });
