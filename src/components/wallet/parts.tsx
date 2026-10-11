"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon, Skeleton } from "@/components/ui";
import type { ChainId } from "@/lib/chain/config";

/* ------------------------------------------------------------ primitives */

/** Copies text to the clipboard with an explicit success/failure state. */
export function CopyButton({
  value,
  label = "Copy address",
  className = "",
  compact = false,
}: {
  value: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2200);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = useCallback(async () => {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        ok = true;
      } else {
        // Older browsers / non-secure origins.
        const area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        document.body.removeChild(area);
      }
    } catch {
      ok = false;
    }
    setState(ok ? "copied" : "failed");
  }, [value]);

  const text = state === "copied" ? "Address copied" : state === "failed" ? "Copy failed" : label;

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:border-ink/40 hover:text-ink ${
        state === "failed" ? "text-negative" : state === "copied" ? "text-positive" : "text-ink2"
      } ${className}`}
    >
      <Icon name={state === "copied" ? "check" : "copy"} size={14} />
      {compact ? null : text}
      {compact ? <span className="sr-only">{text}</span> : null}
      <span aria-live="polite" className="sr-only">
        {state === "idle" ? "" : text}
      </span>
    </button>
  );
}

export function NetworkBadge({ chain }: { chain: ChainId }) {
  const isStellar = chain === "stellar";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-raised px-2.5 py-1 text-[11px] font-bold tracking-wide text-ink2">
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${isStellar ? "bg-accent" : "bg-positive"}`}
      />
      {isStellar ? "STELLAR TESTNET" : "SEPOLIA TESTNET"}
    </span>
  );
}

/** The brand mark for a chain, drawn to match the Earnly tag shape. */
export function ChainMark({ chain, size = 44 }: { chain: ChainId; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="tagshape grid place-items-center bg-accent text-onaccent hard-sm"
      style={{ width: size, height: size }}
    >
      <Icon name={chain === "stellar" ? "swap" : "box"} size={Math.round(size * 0.45)} />
    </span>
  );
}

export function AddressBlock({
  address,
  chain,
  explorerUrl,
  note,
}: {
  address: string;
  chain: ChainId;
  explorerUrl: string;
  note?: string;
}) {
  return (
    <div className="rounded-[14px] border border-rule bg-ground/40 p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="eyebrow">
          {chain === "stellar" ? "Stellar public address" : "Sepolia public address"}
        </span>
        <CopyButton value={address} compact />
      </div>
      <code className="figure block break-all text-[12.5px] leading-relaxed text-ink">
        {address}
      </code>
      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <CopyButton value={address} className="!py-1" />
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink2 hover:text-ink"
        >
          View on explorer
          <Icon name="arrowUpRight" size={14} />
        </a>
      </div>
      {note ? <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink3">{note}</p> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="eyebrow mb-1">{label}</div>
      <div className="figure text-[15px] font-semibold text-ink">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-ink3">{hint}</div> : null}
    </div>
  );
}

export function ErrorPanel({
  message,
  retryable,
  onRetry,
}: {
  message: string;
  retryable?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="tagshape flex flex-wrap items-start gap-3 border border-negative/40 bg-negative/8 p-4"
    >
      <span className="mt-0.5 text-negative">
        <Icon name="alert" size={17} />
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink2">{message}</p>
      {retryable && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:border-ink/40"
        >
          <Icon name="refresh" size={14} />
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function LoadingCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="tagshape border border-rule bg-raised p-6" aria-busy="true" aria-live="polite">
      <span className="eyebrow">Loading…</span>
      <Skeleton className="mt-4 h-10 w-56" />
      <div className="mt-5 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full max-w-[420px]" />
        ))}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="eyebrow mb-1.5 block">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] font-semibold text-negative">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink3">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "figure w-full rounded-[12px] border border-rule bg-ground/50 px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink3/70 focus:border-accent disabled:opacity-50";

/* --------------------------------------------------------------- activity */

export interface ActivityItemView {
  id: string;
  chain: ChainId;
  direction: "in" | "out";
  type: "send" | "receive" | "fund" | "activate";
  asset: string;
  amount: string;
  counterparty: string | null;
  txHash: string | null;
  status: "success" | "failed" | "pending" | "unknown";
  createdAt: string;
  explorerUrl: string | null;
  source: "network" | "app";
  recorded: boolean;
}

const STATUS_STYLE: Record<ActivityItemView["status"], string> = {
  success: "bg-positive/15 text-positive",
  failed: "bg-negative/15 text-negative",
  pending: "bg-ink/10 text-ink2",
  unknown: "bg-accent/20 text-accentx",
};

const STATUS_LABEL: Record<ActivityItemView["status"], string> = {
  success: "Confirmed",
  failed: "Failed",
  pending: "Pending",
  unknown: "Checking",
};

export function ActivityList({
  items,
  decimals,
  symbol,
  emptyHint,
  degraded,
}: {
  items: ActivityItemView[];
  decimals: number;
  symbol: string;
  emptyHint: string;
  degraded?: boolean;
}) {
  if (!items.length) {
    return (
      <p className="rounded-[14px] border border-dashed border-rule p-5 text-[13px] leading-relaxed text-ink3">
        {emptyHint}
      </p>
    );
  }
  return (
    <div className="divide-y divide-rule overflow-hidden rounded-[14px] border border-rule">
      {degraded ? (
        <p className="bg-accent/8 px-4 py-2.5 text-[11.5px] text-ink2">
          Live network history is temporarily unavailable — showing Earnly&apos;s own records.
        </p>
      ) : null}
      {items.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
          <span
            aria-hidden="true"
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              item.direction === "in" ? "bg-positive/15 text-positive" : "bg-ink/8 text-ink2"
            }`}
          >
            <Icon name={item.direction === "in" ? "download" : "arrowUpRight"} size={15} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold">
              {item.type === "fund"
                ? "Funded from Friendbot"
                : item.direction === "in"
                  ? "Received"
                  : "Sent"}
              {item.counterparty ? (
                <span className="figure ml-2 text-[11.5px] font-normal text-ink3">
                  {item.counterparty.length > 16
                    ? `${item.counterparty.slice(0, 8)}…${item.counterparty.slice(-6)}`
                    : item.counterparty}
                </span>
              ) : null}
            </div>
            <div className="figure mt-0.5 text-[11.5px] text-ink3">
              {new Date(item.createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>

          <span
            className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-wide ${STATUS_STYLE[item.status]}`}
          >
            {STATUS_LABEL[item.status]}
          </span>

          <div className="figure w-full text-right text-[13.5px] font-semibold sm:w-auto">
            {item.direction === "in" ? "+" : "−"}
            {trimAmount(item.amount, decimals)} {symbol}
          </div>

          {item.explorerUrl ? (
            <a
              href={item.explorerUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink3 hover:text-ink"
            >
              explorer
              <Icon name="arrowUpRight" size={12} />
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function trimAmount(value: string, decimals: number): string {
  const [whole, fraction = ""] = String(value).split(".");
  const kept = fraction.slice(0, Math.min(decimals, 6)).replace(/0+$/, "");
  return kept ? `${whole}.${kept}` : whole;
}

/* ------------------------------------------------------------------- misc */

export function BackToPayments() {
  return (
    <Link
      href="/app/payments"
      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink3 hover:text-ink"
    >
      <Icon name="arrowLeft" size={14} />
      Payments
    </Link>
  );
}
