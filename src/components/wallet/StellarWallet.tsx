"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Button, Icon, Tag } from "@/components/ui";
import {
  ActivityList,
  AddressBlock,
  BackToPayments,
  ChainMark,
  CopyButton,
  ErrorPanel,
  Field,
  LoadingCard,
  NetworkBadge,
  StatTile,
  inputClass,
  type ActivityItemView,
} from "./parts";

interface StellarOverview {
  wallet: { id: string; address: string; status: string; balanceSyncedAt: string | null };
  network: { label: string; asset: string; explorer: string; horizon: string; friendbot: string };
  account: {
    exists: boolean;
    funded: boolean;
    xlmBalance: string;
    balances: { asset: string; code: string; issuer: string | null; balance: string }[];
    subentries: number;
    minimumBalanceXlm: string;
    spendableXlm: string;
    lastModifiedLedger: number | null;
  };
  fees: { paymentFeeXlm: string; source: "network" | "default" };
  activity: ActivityItemView[];
  degraded: boolean;
  syncedAt: string;
}

interface PaymentPreviewView {
  sourceAddress: string;
  destination: string;
  amount: string;
  fee: string;
  totalDebit: string;
  spendable: string;
  remaining: string;
  memo: string | null;
  networkLabel: string;
}

interface SendOutcomeView {
  status: "success" | "failed" | "unknown";
  hash: string | null;
  ledger: number | null;
  amount: string;
  destination: string;
  explorerUrl: string | null;
  message: string;
  createdAt: string;
}

class ApiError extends Error {
  code: string;
  retryable: boolean;
  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || body.ok === false) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "Something went wrong.",
      typeof body.code === "string" ? body.code : "error",
      Boolean(body.retryable)
    );
  }
  return body as T;
}

export function StellarWallet() {
  const [data, setData] = useState<StellarOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [funding, setFunding] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "syncing">("idle");

  const fetchOverview = useCallback(
    () => api<StellarOverview>("/api/wallet/stellar?history=15"),
    []
  );

  const load = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      try {
        const result = await fetchOverview();
        setData(result);
        setError(null);
      } catch (caught) {
        const err = caught as ApiError;
        setError({ message: err.message, retryable: err.retryable });
      } finally {
        setLoading(false);
        setRefreshing(false);
        setSyncState("idle");
      }
    },
    [fetchOverview]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchOverview();
        if (cancelled) return;
        setData(result);
        setError(null);
      } catch (caught) {
        if (cancelled) return;
        const err = caught as ApiError;
        setError({ message: err.message, retryable: err.retryable });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOverview]);

  // Balance and history are re-read on an interval so an incoming payment shows
  // up without the student having to reload. Manual refresh always works too.
  useEffect(() => {
    if (!data) return;
    const interval = receiveOpen ? 8_000 : 25_000;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        setSyncState("syncing");
        void load("refresh");
      }
    }, interval);
    return () => clearInterval(timer);
  }, [data, load, receiveOpen]);

  const fund = useCallback(async () => {
    setFunding(true);
    setNotice(null);
    try {
      const result = await api<{ status: string; message: string }>("/api/wallet/stellar/fund", {
        method: "POST",
        body: "{}",
      });
      setNotice(result.message);
      await load("refresh");
    } catch (caught) {
      setNotice((caught as ApiError).message);
    } finally {
      setFunding(false);
    }
  }, [load]);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-[1180px] space-y-5">
        <BackToPayments />
        <LoadingCard lines={4} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1180px] space-y-5">
        <BackToPayments />
        <ErrorPanel
          message={error?.message ?? "Your Stellar wallet could not be loaded."}
          retryable
          onRetry={() => void load("initial")}
        />
      </div>
    );
  }

  const unfunded = !data.account.exists;

  return (
    <div className="mx-auto max-w-[1180px]">
      <BackToPayments />

      <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="eyebrow">Stellar</span>
            <NetworkBadge chain="stellar" />
          </div>
          <h1 className="display mt-2 text-[32px] sm:text-[42px]">Stellar wallet</h1>
          <p className="mt-3 max-w-[58ch] text-[14.5px] leading-relaxed text-ink2">
            A Testnet wallet created with your Earnly account. No extension, no seed phrase to keep
            — sign in and it is here. Testnet XLM has no real-world value.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncState === "syncing" ? (
            <span className="text-[12px] text-ink3" aria-live="polite">
              Syncing…
            </span>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load("refresh")}
            disabled={refreshing}
          >
            <Icon name="refresh" size={15} />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </header>

      {error ? (
        <div className="mb-5">
          <ErrorPanel
            message={error.message}
            retryable={error.retryable}
            onRetry={() => void load("refresh")}
          />
        </div>
      ) : null}

      {notice ? (
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-rule px-3.5 py-2 text-[12.5px] text-ink2">
          <Icon name="clock" size={14} />
          {notice}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* balance */}
        <div className="tagshape relative overflow-hidden border border-rule bg-raised p-6 sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/12 blur-3xl"
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <ChainMark chain="stellar" />
              <div>
                <div className="eyebrow">Available balance</div>
                <div className="text-[13px] font-semibold text-ink2">{data.network.label}</div>
              </div>
            </div>

            <div className="mt-5 flex items-end gap-2">
              <span className="display text-[42px] sm:text-[56px]">
                {trim(data.account.xlmBalance, 7)}
              </span>
              <span className="mb-2 text-[16px] font-bold text-accentx">XLM</span>
            </div>

            {unfunded ? (
              <p className="mt-3 rounded-[12px] border border-dashed border-rule p-3.5 text-[12.5px] leading-relaxed text-ink2">
                This address exists but has no ledger entry yet. A Stellar account becomes active
                when it first receives XLM, so it cannot hold a balance until it is funded.
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-rule pt-5">
              <StatTile
                label="Spendable now"
                value={`${trim(data.account.spendableXlm, 7)} XLM`}
                hint="After reserve and fee"
              />
              <StatTile
                label="Account reserve"
                value={`${trim(data.account.minimumBalanceXlm, 7)} XLM`}
                hint={`${data.account.subentries} subentr${data.account.subentries === 1 ? "y" : "ies"}`}
              />
              <StatTile
                label="Network fee"
                value={`${trim(data.fees.paymentFeeXlm, 7)} XLM`}
                hint={data.fees.source === "network" ? "Live from Horizon" : "Base fee fallback"}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {unfunded ? (
                <Button onClick={() => void fund()} disabled={funding}>
                  <Icon name="plus" size={16} />
                  {funding ? "Funding…" : "Claim test XLM"}
                </Button>
              ) : (
                <Button onClick={() => setSendOpen(true)}>
                  <Icon name="arrowUpRight" size={16} />
                  Send XLM
                </Button>
              )}
              <Button variant="outline" onClick={() => setReceiveOpen(true)}>
                <Icon name="download" size={16} />
                Receive
              </Button>
              {!unfunded ? (
                <Button variant="ghost" onClick={() => void fund()} disabled={funding}>
                  Claim test XLM
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* address + state */}
        <div className="tagshape border border-rule bg-raised p-6">
          <div className="eyebrow mb-3">Your address</div>
          <AddressBlock
            address={data.wallet.address}
            chain="stellar"
            explorerUrl={`${data.network.explorer}/${data.wallet.address}`}
            note="Safe to share. It is a public address — the signing key never leaves the server."
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Tag tone={unfunded ? "quiet" : "positive"}>
              {unfunded ? "Not activated yet" : "Active on Testnet"}
            </Tag>
            <Tag tone="quiet">Horizon: horizon-testnet</Tag>
          </div>
          {data.account.lastModifiedLedger ? (
            <p className="mt-3 text-[11.5px] text-ink3">
              Last ledger activity: <span className="figure">{data.account.lastModifiedLedger}</span>
            </p>
          ) : null}
        </div>
      </section>

      {/* activity */}
      <section className="mt-9">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="display-tight text-[20px]">Transaction history</h2>
          <span className="text-[11.5px] text-ink3">
            Synced {new Date(data.syncedAt).toLocaleTimeString()}
          </span>
        </div>
        <ActivityList
          items={data.activity}
          decimals={7}
          symbol="XLM"
          degraded={data.degraded}
          emptyHint={
            unfunded
              ? "No activity yet. Claim test XLM with Friendbot to activate the account."
              : "No payments yet. Send or receive test XLM and it will appear here."
          }
        />
      </section>

      {sendOpen ? (
        <SendDialog
          onClose={() => setSendOpen(false)}
          balance={data.account.xlmBalance}
          spendable={data.account.spendableXlm}
          fee={data.fees.paymentFeeXlm}
          onSent={() => void load("refresh")}
        />
      ) : null}
      {receiveOpen ? (
        <ReceiveDialog
          onClose={() => setReceiveOpen(false)}
          address={data.wallet.address}
          explorerUrl={`${data.network.explorer}/${data.wallet.address}`}
          friendbot={data.network.friendbot}
        />
      ) : null}
    </div>
  );
}

function trim(value: string, decimals: number): string {
  const [whole, fraction = ""] = String(value).split(".");
  const kept = fraction.slice(0, Math.min(decimals, 4)).replace(/0+$/, "");
  return kept ? `${whole}.${kept}` : whole;
}

/* ------------------------------------------------------------------- send */

function SendDialog({
  onClose,
  balance,
  spendable,
  fee,
  onSent,
}: {
  onClose: () => void;
  balance: string;
  spendable: string;
  fee: string;
  onSent: () => void;
}) {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [preview, setPreview] = useState<PaymentPreviewView | null>(null);
  const [outcome, setOutcome] = useState<SendOutcomeView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const reset = useCallback(() => {
    setDestination("");
    setAmount("");
    setMemo("");
    setPreview(null);
    setOutcome(null);
    setError(null);
    idempotencyKey.current = null;
  }, []);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const review = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ preview: PaymentPreviewView }>("/api/wallet/stellar/send", {
        method: "POST",
        body: JSON.stringify({ mode: "preview", destination, amount, memo }),
      });
      setPreview(result.preview);
      idempotencyKey.current =
        globalThis.crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.random()}`;
    } catch (caught) {
      setError((caught as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!preview || !idempotencyKey.current) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ outcome: SendOutcomeView }>("/api/wallet/stellar/send", {
        method: "POST",
        body: JSON.stringify({
          mode: "submit",
          confirm: true,
          destination: preview.destination,
          amount: preview.amount,
          memo: preview.memo ?? "",
          idempotencyKey: idempotencyKey.current,
        }),
      });
      setOutcome(result.outcome);
      onSent();
    } catch (caught) {
      setError((caught as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell label="Send XLM" onClose={close}>
      {outcome ? (
        <SuccessPanel
          outcome={outcome}
          asset="XLM"
          onClose={close}
          onAgain={() => {
            reset();
          }}
        />
      ) : preview ? (
        <>
          <DialogTitle title="Review payment" subtitle="Nothing has been signed yet." />
          <dl className="mt-5 space-y-3 rounded-[14px] border border-rule bg-ground/40 p-4">
            <Row label="To" value={preview.destination} mono />
            <Row label="Amount" value={`${preview.amount} XLM`} />
            <Row label="Network fee" value={`${preview.fee} XLM`} />
            <Row label="Total debit" value={`${preview.totalDebit} XLM`} />
            {preview.memo ? <Row label="Memo" value={preview.memo} /> : null}
            <Row label="Network" value={preview.networkLabel} />
            <Row label="Remaining after" value={`${trim(preview.remaining, 7)} XLM spendable`} />
          </dl>
          {error ? (
            <div className="mt-4">
              <ErrorPanel message={error} />
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void confirm()} disabled={busy}>
              {busy ? "Signing and submitting…" : "Confirm and send"}
            </Button>
            <Button variant="outline" onClick={() => setPreview(null)} disabled={busy}>
              Edit
            </Button>
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink3">
            Confirming signs the transaction with your Earnly-managed key and submits it to Stellar
            Testnet. The address cannot be changed after signing.
          </p>
        </>
      ) : (
        <>
          <DialogTitle title="Send XLM" subtitle="Stellar Testnet · test funds only" />
          <div className="mt-5 space-y-4">
            <Field
              label="Recipient address"
              htmlFor="stellar-destination"
              hint="A Stellar public key, 56 characters starting with G."
            >
              <input
                id="stellar-destination"
                className={inputClass}
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="G…"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field
              label="Amount (XLM)"
              htmlFor="stellar-amount"
              hint={`Balance ${trim(balance, 7)} XLM · ${trim(spendable, 7)} XLM spendable after reserve and fee.`}
            >
              <input
                id="stellar-amount"
                className={inputClass}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="1.5"
                inputMode="decimal"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Memo (optional)"
              htmlFor="stellar-memo"
              hint="Up to 28 bytes of text. Some services need this to credit a payment."
            >
              <input
                id="stellar-memo"
                className={inputClass}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                autoComplete="off"
              />
            </Field>
          </div>
          {error ? (
            <div className="mt-4">
              <ErrorPanel message={error} />
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void review()} disabled={busy || !destination || !amount}>
              {busy ? "Checking…" : "Review payment"}
            </Button>
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
          </div>
          <p className="mt-3 text-[11.5px] text-ink3">
            Estimated network fee: <span className="figure">{trim(fee, 7)} XLM</span>.
          </p>
        </>
      )}
    </DialogShell>
  );
}

/* ---------------------------------------------------------------- receive */

function ReceiveDialog({
  onClose,
  address,
  explorerUrl,
  friendbot,
}: {
  onClose: () => void;
  address: string;
  explorerUrl: string;
  friendbot: string;
}) {
  return (
    <DialogShell label="Receive XLM" onClose={onClose}>
      <DialogTitle title="Receive XLM" subtitle="Stellar Testnet · test funds only" />
      <div className="mt-5 flex flex-col items-center gap-4 rounded-[14px] border border-rule bg-white p-5">
        <QRCode value={address} size={168} bgColor="#ffffff" fgColor="#0b1020" />
        <code className="figure break-all text-center text-[12px] text-[#16181c]">{address}</code>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CopyButton value={address} />
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-[12.5px] font-semibold text-ink2 hover:text-ink"
        >
          Open in Stellar Expert
          <Icon name="arrowUpRight" size={13} />
        </a>
      </div>
      <ul className="mt-5 space-y-2 text-[12.5px] leading-relaxed text-ink2">
        <li>
          Anyone on Stellar Testnet can send test XLM to this address. Opening this screen does not
          create a payment — it only shows your address.
        </li>
        <li>
          If the account is not active yet, the first incoming payment must be at least 1 XLM to
          create the ledger entry.
        </li>
        <li>
          Testnet funds have no real-world value and cannot be exchanged for money. Friendbot is the
          official Testnet faucet: {friendbot}.
        </li>
      </ul>
      <div className="mt-5">
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </DialogShell>
  );
}

/* --------------------------------------------------------------- shell bits */

function DialogShell({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="settle relative z-10 max-h-[92vh] w-full overflow-y-auto overscroll-contain rounded-t-[24px] bg-raised p-6 shadow-2xl sm:m-6 sm:max-w-[560px] sm:rounded-[24px]"
      >
        {children}
      </div>
    </div>
  );
}

function DialogTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="display-tight text-[24px]">{title}</h2>
      {subtitle ? <p className="mt-1 text-[12.5px] text-ink3">{subtitle}</p> : null}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-[12.5px] text-ink3">{label}</dt>
      <dd
        className={`min-w-0 break-all text-right text-[13px] font-semibold text-ink ${mono ? "figure" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function SuccessPanel({
  outcome,
  asset,
  onClose,
  onAgain,
}: {
  outcome: SendOutcomeView;
  asset: string;
  onClose: () => void;
  onAgain: () => void;
}) {
  const failed = outcome.status === "failed";
  const unknown = outcome.status === "unknown";
  return (
    <>
      <div className="flex items-center gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-full ${
            failed ? "bg-negative/15 text-negative" : unknown ? "bg-accent/20 text-accentx" : "bg-positive/15 text-positive"
          }`}
        >
          <Icon name={failed ? "x" : unknown ? "clock" : "check"} size={20} />
        </span>
        <DialogTitle
          title={failed ? "Payment failed" : unknown ? "Outcome not yet known" : "Payment sent"}
          subtitle={outcome.message}
        />
      </div>
      <dl className="mt-5 space-y-3 rounded-[14px] border border-rule bg-ground/40 p-4">
        <Row label="Amount" value={`${outcome.amount} ${asset}`} />
        <Row label="To" value={outcome.destination} mono />
        {outcome.hash ? <Row label="Transaction hash" value={outcome.hash} mono /> : null}
        {outcome.ledger ? <Row label="Ledger" value={String(outcome.ledger)} /> : null}
        <Row label="Network" value="Stellar Testnet" />
        <Row label="Time" value={new Date(outcome.createdAt).toLocaleString()} />
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        {outcome.explorerUrl ? (
          <a
            href={outcome.explorerUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-onaccent hard-sm"
          >
            View on Stellar Expert
            <Icon name="arrowUpRight" size={15} />
          </a>
        ) : null}
        {!failed ? (
          <Button variant="outline" onClick={onAgain}>
            Send another
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      {unknown ? (
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink3">
          We keep checking this transaction against Horizon and will never resubmit it blindly, so it
          cannot be paid twice.
        </p>
      ) : null}
    </>
  );
}
