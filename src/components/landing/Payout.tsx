import Link from "next/link";
import { Button, Icon } from "@/components/ui";

/**
 * The payout section of the landing page. The Stellar and Ethereum wallets are
 * the one live money rail in the product, so this is written as fact, not a
 * preview — with the Testnet caveat stated in full at the foot of the section.
 */
const RAILS = [
  {
    key: "stellar",
    name: "Stellar",
    network: "Stellar Testnet",
    icon: "wallet",
    href: "/app/payments/stellar",
    tagline: "Pay lands in seconds, for a fraction of a cent.",
    blurb:
      "A Stellar wallet is created with your Earnly account. Approve a piece of work, pick this rail, and the payment settles in a handful of ledgers — no bank, no waiting window, no address to copy.",
    facts: [
      { t: "Settles in about five seconds", d: "Confirmed in a few ledgers, not a few days." },
      { t: "Fees under a cent", d: "The Stellar base fee is a fraction of a fraction." },
      { t: "USDC-ready rail", d: "The same wallet holds the stablecoin once settlement switches on." },
    ],
    stat: { k: "Network", v: "Testnet" },
  },
  {
    key: "evm",
    name: "Ethereum",
    network: "Ethereum Sepolia",
    icon: "layers",
    href: "/app/payments/ethereum",
    tagline: "The biggest smart-contract network, embedded in Earnly.",
    blurb:
      "An Ethereum wallet is provisioned inside Earnly — no MetaMask, no browser extension, no seed phrase to write down. Choose it as your payout rail and your test ETH arrives there.",
    facts: [
      { t: "Embedded wallet", d: "Created with your account; nothing to install." },
      { t: "Sepolia testnet", d: "Run the whole flow without touching real funds." },
      { t: "One address, always", d: "It survives refresh, sign-out and redeploy." },
    ],
    stat: { k: "Chain id", v: "11155111" },
  },
] as const;

export function PayoutRails() {
  return (
    <section id="payout" className="border-t border-rule">
      <div className="mx-auto max-w-[1240px] px-5 py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="eyebrow">Getting paid</span>
            <h2 className="display mt-3 max-w-[24ch] text-[32px] sm:text-[44px]">
              Two payout wallets, both switched on.
            </h2>
          </div>
          <p className="max-w-[48ch] text-[14px] leading-relaxed text-ink2">
            Earnly builds an embedded{" "}
            <strong className="font-semibold text-ink">Stellar</strong> wallet and an embedded{" "}
            <strong className="font-semibold text-ink">Ethereum</strong> wallet the moment you sign
            in. When work is approved you pick the rail, and the pay lands in the wallet you chose —
            no extension, no seed phrase, no address typed by hand.
          </p>
        </div>

        <PayoutRailGraphic />

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {RAILS.map((rail, i) => (
            <article
              key={rail.key}
              className={`${
                i === 0 ? "tagshape" : "tagshape-r"
              } flex flex-col border border-rule bg-raised p-6 sm:p-7`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-accent/15 text-accentx">
                    <Icon name={rail.icon} size={19} />
                  </span>
                  <div>
                    <h3 className="display-tight text-[20px]">{rail.name} wallet</h3>
                    <div className="text-[12px] text-ink3">{rail.network}</div>
                  </div>
                </div>
                <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.12em] text-accentx">
                  <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
                  Enabled · payout
                </span>
              </div>

              <p className="display-tight mt-5 max-w-[24ch] text-[22px] sm:text-[24px]">
                {rail.tagline}
              </p>
              <p className="mt-3 max-w-[52ch] text-[13.5px] leading-relaxed text-ink2">
                {rail.blurb}
              </p>

              <dl className="mt-5 space-y-3">
                {rail.facts.map((fact) => (
                  <div
                    key={fact.t}
                    className="flex gap-3 border-b border-rule pb-3 last:border-0 last:pb-0"
                  >
                    <span className="mt-0.5 flex-none text-positive">
                      <Icon name="check" size={15} />
                    </span>
                    <div>
                      <dt className="text-[13.5px] font-semibold">{fact.t}</dt>
                      <dd className="text-[12.5px] text-ink3">{fact.d}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                <div>
                  <div className="figure text-[18px] font-bold">{rail.stat.v}</div>
                  <div className="mt-0.5 text-[11px] text-ink3">{rail.stat.k}</div>
                </div>
                <Link
                  href={rail.href}
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accentx underline underline-offset-4"
                >
                  Open the {rail.name} wallet
                  <Icon name="arrowRight" size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="tagshape mt-6 flex flex-wrap items-center justify-between gap-4 border border-dashed border-rule p-5">
          <p className="max-w-[64ch] text-[12.5px] leading-relaxed text-ink3">
            Both rails settle on real test networks — Stellar Testnet and Ethereum Sepolia. Real
            wallets, real signed transactions, test funds: no real money can move. Mainnet is refused
            at the signing boundary, so a mistake cannot cost anyone anything.
          </p>
          <Button href="/app/payments" variant="outline" size="md" iconRight="arrowRight">
            See payments
          </Button>
        </div>
      </div>
    </section>
  );
}

/**
 * The payout rail, drawn once as an SVG so it scales with the card. An approved
 * amount leaves the work tag, splits along two rails, and settles in the Stellar
 * and Ethereum wallets. The moving dashes are the `.rail-flow` CSS animation; the
 * global prefers-reduced-motion rule parks them as a static dotted track.
 */
function PayoutRailGraphic() {
  return (
    <div className="tagshape mt-8 border border-rule bg-raised px-4 py-4 sm:px-8 sm:py-6">
      <svg
        viewBox="0 0 960 200"
        className="mx-auto block h-auto w-full max-w-[900px]"
        role="img"
        aria-label="An approved amount splits along two rails and settles in a Stellar wallet and an Ethereum wallet."
      >
        {/* the work tag */}
        <path
          d="M8,56 H236 A16,16 0 0 1 252,72 V120 A16,16 0 0 1 236,136 H24 A16,16 0 0 1 8,120 V56 Z"
          style={{ fill: "var(--raised-2)", stroke: "var(--rule)" }}
        />
        <text
          x="28"
          y="86"
          style={{ fill: "var(--ink-3)", fontSize: 11, fontWeight: 700, letterSpacing: 1.4 }}
        >
          APPROVED WORK
        </text>
        <text
          x="28"
          y="124"
          className="figure"
          style={{ fill: "var(--ink)", fontSize: 32, fontWeight: 700 }}
        >
          $150.00
        </text>
        <text
          x="182"
          y="124"
          style={{ fill: "var(--accent-text)", fontSize: 13, fontWeight: 700 }}
        >
          USDC
        </text>

        <text
          x="476"
          y="36"
          textAnchor="middle"
          style={{ fill: "var(--ink-3)", fontSize: 11, fontWeight: 700, letterSpacing: 1.4 }}
        >
          CHOOSE A RAIL
        </text>

        {/* the two rails: a quiet base line with a lamp-amber dash travelling it */}
        <path
          d="M254,96 C400,96 460,50 700,50"
          style={{ fill: "none", stroke: "var(--ink-3)", strokeOpacity: 0.32, strokeWidth: 2 }}
        />
        <path
          d="M254,96 C400,96 460,150 700,150"
          style={{ fill: "none", stroke: "var(--ink-3)", strokeOpacity: 0.32, strokeWidth: 2 }}
        />
        <path
          d="M254,96 C400,96 460,50 700,50"
          pathLength={100}
          className="rail-flow"
          style={{
            fill: "none",
            stroke: "var(--accent)",
            strokeWidth: 2.5,
            strokeLinecap: "round",
          }}
        />
        <path
          d="M254,96 C400,96 460,150 700,150"
          pathLength={100}
          className="rail-flow"
          style={{
            fill: "none",
            stroke: "var(--accent)",
            strokeWidth: 2.5,
            strokeLinecap: "round",
            animationDelay: "0.9s",
          }}
        />
        <circle cx="252" cy="96" r="4" style={{ fill: "var(--accent)" }} />

        {/* the two wallet destinations */}
        <path
          d="M700,14 H936 A16,16 0 0 1 952,30 V70 A16,16 0 0 1 936,86 H716 A16,16 0 0 1 700,70 V14 Z"
          style={{ fill: "var(--raised-2)", stroke: "var(--rule)" }}
        />
        <circle cx="722" cy="50" r="4" style={{ fill: "var(--accent)" }} />
        <text x="736" y="44" style={{ fill: "var(--ink)", fontSize: 16, fontWeight: 800 }}>
          Stellar
        </text>
        <text x="736" y="64" style={{ fill: "var(--ink-3)", fontSize: 12 }}>
          Stellar Testnet
        </text>

        <path
          d="M700,114 H936 A16,16 0 0 1 952,130 V170 A16,16 0 0 1 936,186 H716 A16,16 0 0 1 700,170 V114 Z"
          style={{ fill: "var(--raised-2)", stroke: "var(--rule)" }}
        />
        <circle cx="722" cy="150" r="4" style={{ fill: "var(--accent)" }} />
        <text x="736" y="144" style={{ fill: "var(--ink)", fontSize: 16, fontWeight: 800 }}>
          Ethereum
        </text>
        <text x="736" y="164" style={{ fill: "var(--ink-3)", fontSize: 12 }}>
          Ethereum Sepolia
        </text>
      </svg>
    </div>
  );
}
