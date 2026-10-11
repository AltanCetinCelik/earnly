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

interface EvmOverview {
  wallet: { id: string; address: string; status: string; balanceSyncedAt: string | null };
  network: {
    label: string;
    chainId: number;
    explorer: string;
    asset: string;
    faucets: { label: string; url: string }[];
  };
  account: {
    exists: boolean;
    balanceWei: string;
    balanceEth: string;
    spendableWei: string;
    spendableEth: string;
    nonce: number;
    blockNumber: string;
    gasPriceWei: string | null;
  };
  activity: ActivityItemView[];
  degraded: boolean;
  syncedAt: string;
}

interface EvmPreviewView {
  from: string;
  to: string;
  amount: string;
  balanceEth: string;
  spendableEth: string;
  estimatedFeeEth: string | null;
  totalEth: string | null;
  networkLabel: string;
  chainId: number;
}

interface EvmOutcomeView {
  status: "success" | "failed" | "unknown";
  hash: string | null;
  amount: string;
  to: string;
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

export function EvmWallet() {
  const [data, setData] = useState<EvmOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const fetchOverview = useCallback(() => api<EvmOverview>("/api/wallet/evm?history=15"), []);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      try {
        const result = await fetchOverview();
        setData(result);
        setError(null);
      } catch (caught) {
        setError({ message: (caught as ApiError).message, retryable: (caught as ApiError).retryable });
      } finally {
        setLoading(false);
        setRefreshing(false);
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
        setError({
          message: (caught as ApiError).message,
          retryable: (caught as ApiError).retryable,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOverview]);

  useEffect(() => {
    if (!data) return;
    const interval = receiveOpen ? 8_000 : 25_000;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load("refresh");
    }, interval);
    return () => clearInterval(timer);
  }, [data, load, receiveOpen]);

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
          message={error?.message ?? "Your Sepolia wallet could not be loaded."}
          retryable
          onRetry={() => void load("initial")}
        />
      </div>
    );
  }

  const empty = BigInt(data.account.balanceWei) === 0n;

  return (
    <div className="mx-auto max-w-[1180px]">
      <BackToPayments />

      <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="eyebrow">Ethereum</span>
            <NetworkBadge chain="evm" />
          </div>
          <h1 className="display mt-2 text-[32px] sm:text-[42px]">Sepolia wallet</h1>
          <p className="mt-3 max-w-[58ch] text-[14.5px] leading-relaxed text-ink2">
            An embedded Sepolia wallet created with your Earnly account. No MetaMask, no external
            wallet — test ETH only, with no real-world value.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="tagshape relative overflow-hidden border border-rule bg-raised p-6 sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-positive/10 blur-3xl"
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <ChainMark chain="evm" />
              <div>
                <div className="eyebrow">Available balance</div>
                <div className="text-[13px] font-semibold text-ink2">
                  {data.network.label} · chain{" "}
                  <span className="figure">{data.network.chainId}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-end gap-2">
              <span className="display text-[42px] sm:text-[56px]">
                {trimEth(data.account.balanceEth)}
              </span>
              <span className="mb-2 text-[16px] font-bold text-accentx">ETH</span>
            </div>

            {empty ? (
              <p className="mt-3 rounded-[12px] border border-dashed border-rule p-3.5 text-[12.5px] leading-relaxed text-ink2">
                This wallet has no test ETH yet. Sepolia ETH is free from a faucet — copy the address
                and request some, then press Refresh. It has no monetary value.
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-rule pt-5">
              <StatTile
                label="Spendable (gas reserve)"
                value={`${trimEth(data.account.spendableEth)} ETH`}
                hint="Balance minus a gas buffer"
              />
              <StatTile label="Nonce" value={String(data.account.nonce)} hint="Outgoing tx count" />
              <StatTile
                label="Block"
                value={data.account.blockNumber}
                hint={data.account.gasPriceWei ? "Gas price read live" : "Gas price unavailable"}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setSendOpen(true)} disabled={empty}>
                <Icon name="arrowUpRight" size={16} />
                Send ETH
              </Button>
              <Button variant="outline" onClick={() => setReceiveOpen(true)}>
                <Icon name="download" size={16} />
                Receive
              </Button>
            </div>
          </div>
        </div>

        <div className="tagshape border border-rule bg-raised p-6">
          <div className="eyebrow mb-3">Your address</div>
          <AddressBlock
            address={data.wallet.address}
            chain="evm"
            explorerUrl={`${data.network.explorer}/${data.wallet.address}`}
            note="Safe to share. Test ETH sent here is spendable from this dashboard."
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Tag tone={empty ? "quiet" : "positive"}>{empty ? "Zero balance" : "Funded"}</Tag>
            <Tag tone="quiet">RPC: Sepolia only</Tag>
          </div>
          <div className="mt-4 border-t border-rule pt-4">
            <div className="eyebrow mb-2">Get test ETH</div>
            <div className="flex flex-wrap gap-2">
              {data.network.faucets.map((faucet) => (
                <a
                  key={faucet.url}
                  href={faucet.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-[12px] font-semibold text-ink2 hover:text-ink"
                >
                  {faucet.label}
                  <Icon name="arrowUpRight" size={12} />
                </a>
              ))}
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink3">
              Faucets need the address below; some ask you to sign in with a social account. Sepolia
              ETH cannot be sold or withdrawn as money.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-9">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="display-tight text-[20px]">Transaction history</h2>
          <span className="text-[11.5px] text-ink3">
            Synced {new Date(data.syncedAt).toLocaleTimeString()}
          </span>
        </div>
        <ActivityList
          items={data.activity}
          decimals={18}
          symbol="ETH"
          degraded={data.degraded}
          emptyHint="No Sepolia activity yet. Fund this address from a faucet and it will show up here."
        />
      </section>

      {sendOpen ? (
        <SendDialog onClose={() => setSendOpen(false)} onSent={() => void load("refresh")} />
      ) : null}
      {receiveOpen ? (
        <ReceiveDialog
          onClose={() => setReceiveOpen(false)}
          address={data.wallet.address}
          explorerUrl={`${data.network.explorer}/${data.wallet.address}`}
        />
      ) : null}
    </div>
  );
}

function trimEth(value: string): string {
  const [whole, fraction = ""] = String(value).split(".");
  const kept = fraction.slice(0, 6).replace(/0+$/, "");
  return kept ? `${whole}.${kept}` : whole;
}

/* ------------------------------------------------------------------- send */

function SendDialog({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState<EvmPreviewView | null>(null);
  const [outcome, setOutcome] = useState<EvmOutcomeView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const reset = useCallback(() => {
    setTo("");
    setAmount("");
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
      const result = await api<{ preview: EvmPreviewView }>("/api/wallet/evm/send", {
        method: "POST",
        body: JSON.stringify({ mode: "preview", to, amount }),
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
      const result = await api<{ outcome: EvmOutcomeView }>("/api/wallet/evm/send", {
        method: "POST",
        body: JSON.stringify({
          mode: "submit",
          confirm: true,
          to: preview.to,
          amount: preview.amount,
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
    <DialogShell label="Send test ETH" onClose={close}>
      {outcome ? (
        <>
          <div className="flex items-center gap-3">
            <span
              className={`grid h-11 w-11 place-items-center rounded-full ${
                outcome.status === "failed"
                  ? "bg-negative/15 text-negative"
                  : outcome.status === "unknown"
                    ? "bg-accent/20 text-accentx"
                    : "bg-positive/15 text-positive"
              }`}
            >
              <Icon
                name={outcome.status === "failed" ? "x" : outcome.status === "unknown" ? "clock" : "check"}
                size={20}
              />
            </span>
            <div>
              <h2 className="display-tight text-[24px]">
                {outcome.status === "failed"
                  ? "Transfer failed"
                  : outcome.status === "unknown"
                    ? "Not confirmed yet"
                    : "Transfer sent"}
              </h2>
              <p className="mt-1 text-[12.5px] text-ink3">{outcome.message}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-3 rounded-[14px] border border-rule bg-ground/40 p-4">
            <Row label="Amount" value={`${outcome.amount} ETH`} />
            <Row label="To" value={outcome.to} mono />
            {outcome.hash ? <Row label="Transaction hash" value={outcome.hash} mono /> : null}
            <Row label="Network" value="Ethereum Sepolia" />
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
                View on Etherscan
                <Icon name="arrowUpRight" size={15} />
              </a>
            ) : null}
            {outcome.status !== "failed" ? (
              <Button variant="outline" onClick={reset}>
                Send another
              </Button>
            ) : null}
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
          </div>
        </>
      ) : preview ? (
        <>
          <h2 className="display-tight text-[24px]">Review transfer</h2>
          <p className="mt-1 text-[12.5px] text-ink3">Nothing has been signed yet.</p>
          <dl className="mt-5 space-y-3 rounded-[14px] border border-rule bg-ground/40 p-4">
            <Row label="To" value={preview.to} mono />
            <Row label="Amount" value={`${preview.amount} ETH`} />
            <Row
              label="Estimated fee"
              value={preview.estimatedFeeEth ? `${trimEth(preview.estimatedFeeEth)} ETH` : "unavailable"}
            />
            {preview.totalEth ? (
              <Row label="Total" value={`${trimEth(preview.totalEth)} ETH`} />
            ) : null}
            <Row label="Balance" value={`${trimEth(preview.balanceEth)} ETH`} />
            <Row label="Network" value={preview.networkLabel} />
          </dl>
          {error ? (
            <div className="mt-4">
              <ErrorPanel message={error} />
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void confirm()} disabled={busy}>
              {busy ? "Signing and broadcasting…" : "Confirm and send"}
            </Button>
            <Button variant="outline" onClick={() => setPreview(null)} disabled={busy}>
              Edit
            </Button>
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink3">
            The chain id is checked against Sepolia (11155111) before signing. A Mainnet RPC is
            refused.
          </p>
        </>
      ) : (
        <>
          <h2 className="display-tight text-[24px]">Send test ETH</h2>
          <p className="mt-1 text-[12.5px] text-ink3">Ethereum Sepolia · test funds only</p>
          <div className="mt-5 space-y-4">
            <Field
              label="Recipient address"
              htmlFor="evm-destination"
              hint="0x followed by 40 hex characters."
            >
              <input
                id="evm-destination"
                className={inputClass}
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field label="Amount (ETH)" htmlFor="evm-amount" hint="At most 18 decimal places.">
              <input
                id="evm-amount"
                className={inputClass}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.01"
                inputMode="decimal"
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
            <Button onClick={() => void review()} disabled={busy || !to || !amount}>
              {busy ? "Checking…" : "Review transfer"}
            </Button>
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
          </div>
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
}: {
  onClose: () => void;
  address: string;
  explorerUrl: string;
}) {
  return (
    <DialogShell label="Receive test ETH" onClose={onClose}>
      <h2 className="display-tight text-[24px]">Receive test ETH</h2>
      <p className="mt-1 text-[12.5px] text-ink3">Ethereum Sepolia · test funds only</p>
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
          Open in Etherscan
          <Icon name="arrowUpRight" size={13} />
        </a>
      </div>
      <ul className="mt-5 space-y-2 text-[12.5px] leading-relaxed text-ink2">
        <li>Send Sepolia test ETH from any Sepolia wallet or faucet to this address.</li>
        <li>Opening this screen does not create a transaction — it only shows your address.</li>
        <li>Sepolia ETH has no real-world value and cannot be withdrawn or exchanged for money.</li>
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
