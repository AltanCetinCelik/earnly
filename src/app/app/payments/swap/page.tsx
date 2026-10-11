"use client";

import { useState } from "react";
import { Button, Icon, Tag } from "@/components/ui";
import { BackToPayments, NetworkBadge } from "@/components/wallet/parts";

/**
 * Deliberately a placeholder. There is no bridge, no aggregator, no quote and
 * no swap transaction behind this page — and no button that pretends otherwise.
 */
export default function SwapPage() {
  const [noted, setNoted] = useState(false);

  return (
    <div className="mx-auto max-w-[900px]">
      <BackToPayments />

      <div className="tagshape relative mt-4 overflow-hidden border border-rule bg-raised p-7 sm:p-11">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/12 blur-2xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="tagshape grid h-11 w-11 place-items-center bg-accent text-onaccent hard-sm">
              <Icon name="swap" size={20} />
            </span>
            <span className="eyebrow">Coming soon</span>
            <span className="rounded-full border border-rule px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-ink3">
              COMING SOON
            </span>
          </div>

          <h1 className="display mt-6 text-[42px] sm:text-[64px]">Swap</h1>
          <p className="mt-3 max-w-[46ch] text-[17px] font-semibold text-ink">
            Swap between blockchain
          </p>
          <p className="mt-3 max-w-[62ch] text-[14.5px] leading-relaxed text-ink2">
            Moving value between Stellar and Ethereum needs a bridge and a liquidity route that
            Earnly does not run yet. When it ships it will live here, along with the fee, the route
            and the settlement time. Until then this page quotes nothing.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <NetworkBadge chain="stellar" />
            <span className="text-ink3" aria-hidden="true">
              <Icon name="swap" size={16} />
            </span>
            <NetworkBadge chain="evm" />
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {["XLM → ETH", "ETH → XLM", "Route and fee preview", "Slippage controls"].map((item) => (
              <Tag key={item} tone="quiet">
                {item}
              </Tag>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
            <Button
              variant={noted ? "outline" : "primary"}
              onClick={() => setNoted(true)}
              iconRight={noted ? undefined : "bell"}
            >
              {noted ? "On the list" : "Tell me when swaps open"}
            </Button>
            <span className="text-[12.5px] text-ink3">
              Marking interest only — no rate is fetched and no trade can be started.
            </span>
          </div>
        </div>
      </div>

      <div className="tagshape mt-5 border border-dashed border-rule p-5">
        <div className="eyebrow mb-3">What is live today</div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink2">
          {["Stellar Testnet wallet", "Send and receive XLM", "Sepolia wallet", "Send test ETH"].map(
            (item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <span className="text-positive">
                  <Icon name="check" size={14} />
                </span>
                {item}
              </span>
            )
          )}
        </div>
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink3">
          A swap is the one payment destination that is intentionally not built. No bridge or
          aggregator is integrated in this release, so there is no fake exchange rate and no
          functional-looking swap button to mislead anyone.
        </p>
      </div>
    </div>
  );
}
