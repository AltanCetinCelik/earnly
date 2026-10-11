# Earnly embedded wallet integration

Stellar Testnet and Ethereum Sepolia embedded wallets for the Payments area:
no MetaMask, no Freighter, no seed phrase, no external wallet of any kind.

- **Stellar Testnet is the primary, fully working wallet** — provisioning,
  balances, XLM send, receive with QR, Friendbot funding and reconciled history.
- **Sepolia is a separate wallet** with its own address, live balance, native
  test ETH transfers and history.
- **Swap is a placeholder.** There is no bridge, no aggregator, no quote and no
  transaction behind it.

---

## 1. What exists, per chain

| Capability | Stellar Testnet | Ethereum Sepolia |
|---|---|---|
| Wallet created with the Earnly account | Yes | Yes |
| Stable address across sessions and deploys | Yes | Yes |
| Live balance from the network | Horizon | JSON-RPC (`eth_getBalance`) |
| Send | Native XLM, signed and submitted | Native test ETH, signed and broadcast |
| Receive | Address, copy, QR, explorer link | Address, copy, QR, faucet links |
| Faucet | Friendbot (`claim test XLM`) | Faucet links (no keyless faucet API exists) |
| History | Horizon operations + our records | Blockscout v2 API + our records |
| Confirmation handling | Ledger inclusion, verified by re-reading Horizon | Receipt status |
| Explorer links | stellar.expert / testnet | sepolia.etherscan.io |

## 2. Custody model — read this first

**The wallet is server-managed (custodial) in this release.** It is not
non-custodial, and it is not a managed KMS. That is a deliberate, documented
bridge, not an accident:

- The signing secret is generated on the server with the official Stellar SDK
  (`Keypair.random()`) or viem (`generatePrivateKey()`).
- It is sealed with **AES-256-GCM** before it is written to Neon. The data key
  is derived per wallet with **HKDF-SHA256** from `WALLET_MASTER_KEY`, salted
  with `chain:network:userId`, so one leaked data key cannot open another
  wallet.
- The plaintext exists only in server memory, only for the duration of one
  signing operation. It is never returned by an API route, never sent to the
  browser, never logged, and never written to a transaction record.
- `wallets.enc_secret / enc_iv / enc_tag / key_version` hold only ciphertext.
  A database dump alone does not yield a usable key; it does yield a key that is
  protected by one secret held in the environment.

What this model does **not** claim: `WALLET_MASTER_KEY` sits in the same
environment as the database credentials, so anyone with full production access
can decrypt wallet keys. That is the weakest link, and it is precisely the link
a managed signer removes.

**Why a managed provider is not wired in yet.** Every provider that offers
Google-linked embedded wallets with server-side signing — Turnkey, Privy,
Crossmint, Blux — requires account credentials, an organisation id and, in most
cases, a paid plan and KYB before it will issue them. No such credential exists
for this project. The brief's instruction for that situation is to implement the
integration boundary and report the blocker rather than claim the wallet is
production-grade, so:

- `src/lib/chain/crypto.ts` and `src/lib/chain/wallets.ts` are the **only**
  modules that touch key material. `wallets.provider` already carries a provider
  name (`earnly-managed`), and `signingSecret()` refuses to sign locally for any
  wallet whose provider is not `earnly-managed`. Swapping in a managed signer
  means adding a provider adapter and flipping that column — no change to any
  route, service or component.
- `.env.example` lists the exact variables a managed signer would need.

**Recommended production path:** Turnkey or Privy, with the signing operation
performed inside the provider and only the public address stored in Neon. Both
support Stellar and EVM and both sign server-side without an extension.

## 3. How Google sign-in connects to the wallets

Auth is unchanged: Google OAuth 2.0 with PKCE, verified server-side against
Google's `userinfo` endpoint, ending in a signed HttpOnly `earnly_session`
cookie (`src/lib/auth.ts`, `src/lib/session.ts`).

Provisioning hangs off that trusted server-side path, never a browser button:

1. `src/app/api/auth/google/callback/route.ts` — after `upsertGoogleUser()` and
   `createSession()` it calls `provisionAfterSignIn(userId)`.
2. `provisionAfterSignIn` is idempotent, swallows nothing silently, and **never
   throws into the sign-in path** — a wallet problem must not stop a student
   signing in. Failures are logged and surface in the UI as a retryable state.
3. `GET /api/wallet` re-runs the same provisioning as a safety net, which covers
   accounts created before this feature existed. Both chains are also provisioned
   on first read of the Payments area.

Email sign-in gets the same treatment, deliberately, so the wallet is not tied to
one login provider. X (Twitter) auth is not part of this phase; because
provisioning keys off the Earnly `users.id` rather than the Google subject, an
additional login provider needs no wallet changes at all.

## 4. Provisioning, stability and recovery

- One row per `(user_id, chain, network)` — enforced by a unique constraint, not
  by convention.
- `ensureWallet()` inserts with `on conflict do nothing`, then re-reads. Two
  concurrent requests therefore converge on one row and one address; the loser
  returns the winner's wallet.
- The address is derived from the key pair and never rotated. It survives logout,
  login, refresh, redeploys and re-provisioning.
- "Recovery" in this release means: the address and sealed key are in Neon, so
  signing works from any device the user signs in on. There is no export, because
  the user never holds the key.
- If `WALLET_MASTER_KEY` is missing the API answers `503 unconfigured` with a
  precise message instead of inventing a wallet or failing obscurely.

## 5. Stellar Testnet: sign and submit

`src/lib/chain/stellar.ts` is the only module that talks to Horizon or signs a
Stellar transaction.

- **Network**: passphrase is `Networks.TESTNET` straight from the SDK — never
  retyped. `assertStellarTestnet()` runs before every read, fund and send and
  refuses a Mainnet passphrase or a `horizon.stellar.org` endpoint.
- **Fee**: read from `fee_stats()` (`last_ledger_base_fee` / `fee_charged`
  mode), clamped to a sane ceiling, with the protocol base fee as fallback. The
  builder receives the fee **in stroops**; XLM figures are display-only.
- **Amounts**: parsed as decimal strings into stroops via `BigInt`
  (`src/lib/chain/decimal.ts`). No floats anywhere. Precision is capped at 7 dp
  for XLM and 18 dp for ETH, and zero, negative, malformed, over-precise and
  over-balance values are rejected **before** anything is signed.
- **Reserve**: minimum balance is `(2 + subentries + sponsoring − sponsored) ×
  0.5 XLM`; the spendable figure subtracts that and the fee, and is floored at
  zero. An over-balance payment is refused with `insufficient_balance` rather
  than being broadcast to fail.
- **Signing**: one signed envelope. Its hash is `sha256(signatureBase)`, so the
  row written to Neon is the hash that lands on the ledger — not a guess.
- **Submission**: the same envelope is submitted to Horizon. `submitTransaction`
  is only reported as a success when Horizon returns a result; the outcome, the
  ledger number and the hash are taken from that response.
- **Timeouts**: a 504/408 is recorded as `unknown` and never resubmitted
  automatically. `reconcileStellarTransaction()` re-reads Horizon (by hash) on
  the next dashboard load. That is what stops a slow ledger producing a double
  payment.
- **Idempotency**: the client sends an idempotency key, protected by a partial
  unique index on `(user_id, idempotency_key)`. A replay returns the first
  result.

## 6. Ethereum Sepolia: sign and submit

`src/lib/chain/evm.ts`.

- **Network**: our own `defineChain` pinned to `id: 11155111` and the configured
  RPC. `assertSepolia()` calls `eth_chainId` and refuses to sign anything if the
  endpoint is not Sepolia — a Mainnet RPC cannot be used by accident.
- **Signing**: viem `privateKeyToAccount()` on the unsealed key, then
  `createWalletClient` with `chain: sepolia`. The account address is re-derived
  from the key and compared to the stored address before signing; a mismatch
  aborts with `signing_unavailable`.
- **Amounts**: `parseEther`-equivalent exact decimal → wei via `BigInt`.
- **Gas**: balance must cover the value plus a `21 000 × gasPrice × 2` buffer;
  fees are estimated with `estimateFeesPerGas()`. Insufficient funds are refused
  before signing.
- **Confirmation**: `waitForTransactionReceipt({ confirmations: 1 })`. A receipt
  timeout is recorded as `unknown` (hash kept), never as success.
- **Reconciliation**: `reconcileEvmTransaction()` re-checks the receipt on the
  next dashboard load.

## 7. Database

Migration `db/migrations/0002_wallets.sql` (idempotent, applied by
`npm run db:migrate`):

**`wallets`** — `id`, `user_id → users(id)`, `chain`, `network`, `provider`,
`address`, `provider_wallet_id`, `status`, `enc_secret`, `enc_iv`, `enc_tag`,
`key_version`, `last_error`, `created_at`, `updated_at`, `balance_synced_at`.
Constraints: unique `(user_id, chain, network)`; unique `(chain, network,
lower(address))`; unique `(provider, provider_wallet_id)`; `chain` and `status`
check constraints.

**`wallet_transactions`** — `id`, `user_id`, `wallet_id`, `chain`, `network`,
`direction`, `type`, `asset`, `amount`, `fee`, `sender_address`,
`recipient_address`, `counterparty`, `tx_hash`, `status`, `ledger`,
`explorer_url`, `error`, `idempotency_key`, `created_at`, `status_synced_at`.
Constraints: partial unique on `(wallet_id, lower(tx_hash))`; partial unique on
`(user_id, idempotency_key)`; indexes on `(user_id, created_at desc)` and
`(wallet_id, created_at desc)`.

No private key, seed, token or signing secret is ever written to
`wallet_transactions`.

## 8. API surface

All routes are `dynamic = "force-dynamic"`, resolve the user from the session
cookie, and ignore any client-supplied identity. One user cannot read or sign for
another — verified by the live check.

| Route | Purpose |
|---|---|
| `GET /api/wallet` | Wallet index; also the idempotent provisioning safety net |
| `POST /api/wallet/provision` | Explicit retry after a provisioning failure |
| `GET /api/wallet/stellar` | Address, live account state, fee, reconciled activity |
| `POST /api/wallet/stellar/fund` | Friendbot funding (Testnet only) |
| `POST /api/wallet/stellar/send` | `mode: "preview"` or `mode: "submit"` + `confirm: true` |
| `GET /api/wallet/evm` | Address, live balance, reconciled activity |
| `POST /api/wallet/evm/send` | Same two-phase contract |

Submitting never happens on a single click: the browser must first call
`preview` (which signs nothing) and then `submit` with `confirm: true` and an
idempotency key.

## 9. Environment variables

See `.env.example`. Beyond the existing Google, Neon, `AUTH_SECRET` and `APP_URL`
keys, this feature adds:

| Variable | Required | Notes |
|---|---|---|
| `WALLET_MASTER_KEY` | **Yes** | 32 bytes base64/hex. `openssl rand -base64 32`. Server-only, never `NEXT_PUBLIC_`. |
| `SEPOLIA_RPC_URL` | Recommended | Defaults to a public Sepolia endpoint. Use a dedicated provider under load. |
| `STELLAR_HORIZON_URL` / `STELLAR_FRIENDBOT_URL` | No | Default to the official Testnet endpoints. |
| `SEPOLIA_EXPLORER_API` | No | Defaults to the keyless Blockscout Sepolia API. |
| `MANAGED_SIGNER_*` | Blocked | Documented placeholders only; see §2. |

`WALLET_MASTER_KEY` is read **only** in `src/lib/chain/crypto.ts`, which is
imported only from server modules.

## 10. Testing

```bash
npm run test              # unit + component suite (52 tests, no network)
npm run lint
npx tsc --noEmit
npm run build
npm run dev               # then, in another shell:
npm run wallet:live-check # real network end-to-end, opt-in
```

**Mocked / offline (52 tests, run in CI):** decimal parsing and precision for
both chains; AES-GCM seal/open round-trips, wrong-context decryption, tamper
detection and per-wallet key derivation; Stellar address validation, reserve and
spendable arithmetic, passphrase assertions, Mainnet-endpoint refusal,
transaction determinism and memo/fee handling; Sepolia chain pinning, address
validation, pre-signing validation order, and a real EIP-1559 signature
recovered back to its signer; provisioning idempotency against a fake database
including a three-way concurrent race; route authorization (401 for no session,
client-supplied user ids ignored, confirmation gate, error passthrough); and a
server-rendered assertion that the Swap page carries the exact required copy and
exposes no control that could execute a trade.

**Real network (`scripts/wallet-live-check.mjs`, 44 checks):** creates two
throwaway users, mints genuine session cookies, and drives the real HTTP API
against a real Neon database and the real Stellar Testnet. It was run against
both `next dev` and the production `next start` build.

## 11. Known limitations and blockers

1. **Managed signing provider not integrated** (see §2). This is the one
   substantive production gap. Required to close it: a Turnkey/Privy/Crossmint
   account — organisation id, API key and, usually, KYB — plus the provider's
   Stellar signing support enabled. Until then the wallet is custodial and the
   master key is a single point of trust.
2. **Sepolia has a zero balance and no keyless faucet.** Every Sepolia faucet
   either requires a social login or is captcha/PoW-gated, and none exposes an
   API we can call from the server without credentials. The Sepolia dashboard
   therefore displays the real address, copy button, QR and faucet links, and
   the send path is fully implemented and unit-verified — but a **successful
   Sepolia broadcast has not been executed**, because the wallet could not be
   funded. The refusal path (`insufficient_balance`) was verified live. To
   complete it: send test ETH to the address from a faucet, then re-run
   `npm run wallet:live-check` — or set a funded treasury key and add a
   `/api/wallet/evm/fund` transfer.
3. **No streaming.** Balances and history refresh on an interval (8s while the
   Receive dialog is open, 25s otherwise) plus a manual Refresh. Horizon's SSE
   stream or a websocket would be the upgrade.
4. **Single-asset scope.** Native XLM and native test ETH only. No Stellar
   issued assets, no trustlines, no ERC-20s — deliberately, so nothing is
   advertised as sendable that is not correctly handled.
5. **Testnet only, by design.** Mainnet is refused at the signing boundary on
   both chains.
6. **No browser/visual pass.** The UI was verified by type-checking, linting,
   the production build and a server-render assertion; a manual visual pass at
   phone/tablet/desktop widths has not been performed.
