# Earnly — Contributor Bounty Issues (Draft)

20 issues for review, priced $50–$120 by complexity. Template follows
`slippay-labs/slippay#107`. Total pool in this draft: **$1,660**.

| # | Issue | Bounty | Label | ETA |
|---|---|---|---|---|
| 1 | Stop clients from self-approving identity verification | $120 | security | 48 hours |
| 2 | Persist applications, saved items and notifications server-side | $120 | persistence | 72 hours |
| 3 | Server-side authorization guard for `/app/*` | $110 | security | 48 hours |
| 4 | Don't mark Stellar transactions failed on a transient Horizon 404 | $100 | bug | 48 hours |
| 5 | Record EVM transactions before broadcast, not after | $100 | bug | 48 hours |
| 6 | Normalize pay units before filtering and sorting | $100 | product | 48 hours |
| 7 | Rate-limit and lock out authentication endpoints | $90 | security | 48 hours |
| 8 | Revoke sessions server-side on sign-out | $90 | security | 36 hours |
| 9 | Origin-check state-changing routes instead of trusting `SameSite=Lax` alone | $90 | security | 48 hours |
| 10 | Bound all Horizon requests with timeouts | $80 | reliability | 36 hours |
| 11 | Add test coverage for auth/profile API routes | $80 | testing | 48 hours |
| 12 | Unify the API error contract across routes | $70 | dx | 36 hours |
| 13 | Remove the float fallback in `toAtomic` | $70 | payments | 24 hours |
| 14 | Focus management for the shared `Modal` | $70 | accessibility | 36 hours |
| 15 | Stop the custom-university upsert from overwriting other users' rows | $70 | bug | 24 hours |
| 16 | Reconcile pending transactions concurrently | $70 | performance | 24 hours |
| 17 | Add CI (lint + test + build) to pull requests | $60 | infrastructure | 12 hours |
| 18 | Close the sign-up account-enumeration oracle | $60 | security | 18 hours |
| 19 | Landing page images, metadata and footer year | $60 | seo | 24 hours |
| 20 | Filter chips: `aria-pressed` + "Clear filters" clears everything | $50 | accessibility | 12 hours |

---

# [Bounty: $120] Stop clients from self-approving identity verification

## Description

**Context**
`PUT /api/profile` in `src/app/api/profile/route.ts:65-68` accepts a
`verification` field straight from the request body and persists any value in
`["required","pending","verified","failed"]` after only a membership check. The
client store ships the matching bypass: `src/lib/store.tsx:297` exposes
`approveVerification` as `save({ verification: "verified" })`, and the verify
page calls it (`src/app/verify/page.tsx:222`). Any signed-in user can
`PUT /api/profile` with `{"verification":"verified"}` and clear the only gate to
the `/app` area (`src/components/AppShell.tsx:53-62`), turning the student
verification step into a client-side suggestion.

**Proposed Change**
Remove `verification` (and any other trust/status flag) from the set of fields
the client body may write. Derive verification state exclusively from the
server-side workflow. Keep demo mode working when no real account exists
(`store.tsx` early-returns without a profile), and either delete
`approveVerification`/`failVerification` from the store or back them with a
real server decision.

**Acceptance Criteria**

- A signed-in `PUT /api/profile` containing `verification` cannot change the
  stored value (field ignored or `400`); server-side state only changes through
  the verification workflow.
- `approveVerification`/`failVerification` no longer write trust flags directly
  through the profile API; the demo/no-account path still renders all four
  verification states.
- Regression test: authenticated PUT with `verification:"verified"` leaves the
  stored value unchanged.
- Verified by the `test` job (see issue #17) / `npm test`.

**Suggested Label**: security
**Bounty:** $120
**ETA:** 48 hours

---

# [Bounty: $120] Persist applications, saved items and notifications server-side

## Description

**Context**
`src/lib/store.tsx:311-348` — `apply`, `advance`, `toggleSaved` and
`markAllRead` are pure `setState` reducers that write only browser state;
nothing calls `save()` or an API for them. An application submitted today is
gone on the next device, after clearing site data, or for any teammate viewing
the same account. The database layer (`src/lib/db.ts`, `db/migrations/`) and the
chain activity merge (`src/lib/chain/activity.ts`) already model applications,
so the schema side likely exists — the UI simply never writes to it.

**Proposed Change**
Add endpoints (or reuse an existing one) that persist apply / stage-advance /
save-toggle / notification-read for the session user. Store actions call them
when signed in and stay in `localStorage` for demo mode (the existing
`store.tsx:218` pattern). Keep optimistic UI updates; surface failures instead
of swallowing them.

**Acceptance Criteria**

- Signed-in apply/advance/toggle/read state survives clearing `localStorage` and
  a fresh browser session (round-trips through Postgres).
- Demo mode (no account) behaves exactly as today.
- New route tests cover auth (401 unauthenticated) and a successful write; store
  round-trip test included.
- Optimistic UI retained; a failed write is reported (at minimum logged and
  rolled back).
- Verified by `npm test`.

**Suggested Label**: persistence
**Bounty:** $120
**ETA:** 72 hours

---

# [Bounty: $110] Server-side authorization guard for `/app/*`

## Description

**Context**
`src/app/app/layout.tsx` is a pure passthrough to `<AppShell>`; the only auth
check in the whole authenticated area is client-side — a `useEffect` redirect
plus a render gate in `src/components/AppShell.tsx:53-62`. Page payloads under
`/app/*` (dashboard, payments, profile) ship to anyone who requests them without
JavaScript. There is no `middleware.ts` anywhere in the repo and no
`getSession()` call in any `/app` server layout or page.

**Proposed Change**
Introduce a server-side gate (root `middleware.ts` or a server layout wrapper)
that redirects unauthenticated users to `/signin`, unverified users to
`/verify`, and non-onboarded users to `/onboarding`, mirroring the AppShell
conditions. Keep the client-side redirect only as a progressive-enhancement
fallback.

**Acceptance Criteria**

- `curl -I /app` with no session cookie → `307` to `/signin`.
- Session cookie without `verified` → redirect to `/verify`; verified but not
  onboarded → redirect to `/onboarding`; full session → `200`.
- Signed-in, verified, onboarded users see no behavior change or layout flash.
- Tests cover each redirect condition (and the guard is unit-testable without a
  live browser).
- Verified by `npm test`.

**Suggested Label**: security
**Bounty:** $110
**ETA:** 48 hours

---

# [Bounty: $100] Don't mark Stellar transactions failed on a transient Horizon 404

## Description

**Context**
`src/lib/chain/stellar.ts:771-778` — `reconcileStellarTransaction` treats any
"not found" error from Horizon as proof the transaction was never included and
writes `status: "failed"`. Horizon routinely returns 404 for a transaction that
has been submitted but not yet ingested (and during failover), so a payment that
is actually settling can be permanently marked failed. This runs from the
dashboard loop in `src/app/api/wallet/stellar/route.ts:30-35` on every load, so
the bad transition fires within seconds of a send.

**Proposed Change**
Make 404 terminal only after a grace period — e.g. keep `pending` for the first
N reconciliations or until the row is older than X minutes since creation, then
fall to `failed`. Distinguish "tx not found" from "tx too old", and persist the
attempt count / last-checked timestamp needed to make that decision.

**Acceptance Criteria**

- A 404 right after creation leaves the transaction `pending`; a 404 after the
  grace window transitions it to `failed`.
- A found transaction with `successful: false` still goes straight to `failed`.
- The grace parameters are constants or config, not magic numbers inline in the
  reconcile loop.
- Unit tests cover all three transitions with a mocked Horizon client.
- Verified by `npm test`.

**Suggested Label**: bug
**Bounty:** $100
**ETA:** 48 hours

---

# [Bounty: $100] Record EVM transactions before broadcast, not after

## Description

**Context**
`src/lib/chain/evm.ts:352-380` — `client.sendTransaction` broadcasts first, then
`recordTransaction` runs afterwards. If the process crashes, the HTTP response
drops, or `recordTransaction` throws, ETH has left the wallet with no local row:
the app has no record of money it just moved, and a retry risks a double spend.
The Stellar path deliberately avoids this — `src/lib/chain/stellar.ts:598`
documents "the application record is written *before* submission". EVM is the
outlier.

**Proposed Change**
Mirror the Stellar ordering: write a `pending` row with a local id/idempotency
key *before* broadcast, then update hash and status after `sendTransaction`
resolves. A crash between record and broadcast must leave a recoverable
`pending`/`unknown` row that reconciliation (`waitForTransactionReceipt`, activity
merge) can settle.

**Acceptance Criteria**

- Local record exists before any bytes hit the network; hash/status are updated
  after broadcast.
- Failure between record and broadcast leaves a row in a recoverable state, and
  a retry of the same send does not double-spend.
- Test: force `recordTransaction` to succeed and `sendTransaction` to throw → a
  row exists (`failed`/`unknown`) and the balance is unchanged.
- Verified by `npm test`.

**Suggested Label**: bug
**Bounty:** $100
**ETA:** 48 hours

---

# [Bounty: $100] Normalize pay units before filtering and sorting

## Description

**Context**
`src/lib/data.ts` mixes pay units — `{amount:150, unit:"fixed"}`,
`{amount:15, unit:"per hour"}`, `{amount:200, unit:"per week"}`,
`{amount:500, unit:"per month"}` — but `src/components/Browse.tsx:44` filters
with a raw `o.pay.amount < minPay` and `:53` sorts with
`b.pay.amount - a.pay.amount`. A $15/hr job is hidden from "50+", while a
$500/month role outranks a $150 fixed gig. The AI layer already documents the
hole: `src/lib/ai.ts:91-93` — "Rates are shown, not filtered, until pay
normalisation" — and skips every non-`fixed` unit in its preference scoring.

**Proposed Change**
Introduce one normalization helper (canonicalize to a documented comparable unit,
e.g. USD-per-hour with stated assumptions) and use it in `Browse.tsx` for both
filter and sort **and** in `ai.ts` (`payMeetsPrefs` / scoring). The UI keeps
displaying the original amount and unit label; only comparisons normalize.

**Acceptance Criteria**

- Single shared helper; no ad-hoc unit math left in `Browse.tsx` or `ai.ts`.
- Filter and sort use normalized values; displayed labels unchanged.
- Boundary tests at the 25+/50+ thresholds covering fixed vs hourly vs weekly
  vs monthly inputs.
- Documented semantics for what "Minimum pay 50+" means across units.
- Verified by `npm test`.

**Suggested Label**: product
**Bounty:** $100
**ETA:** 48 hours

---

# [Bounty: $90] Rate-limit and lock out authentication endpoints

## Description

**Context**
No file under `src/app/api/auth/**` contains any rate, attempt or lockout
logic. `src/app/api/auth/email/route.ts` accepts unlimited sign-in and sign-up
attempts, and `src/lib/auth.ts:211-215` performs a scrypt comparison on every
call — an online brute-force and account-enumeration machine with no brake.
State-changing routes (`PUT /api/profile`, wallet send routes) are equally
unlimited.

**Proposed Change**
Add per-IP and per-account throttling on `/api/auth/email` (a token bucket in
memory is acceptable for the single-container deployment, but behind a documented
interface so Redis/Upstash can back it in production) returning `429` with a
`Retry-After` header. Make unknown-email sign-in cost the same work as a real
comparison (dummy hash) so timing doesn't leak existence.

**Acceptance Criteria**

- The (limit+1)th attempt within the window returns `429` + `Retry-After`.
- A successful login resets the account counter; the limiter survives route
  re-invocation within the same process.
- `signInWithEmail` does constant-ish work for unknown vs known emails.
- Tests: over-limit → 429, reset-after-success, and no effect on unrelated
  routes.
- Verified by `npm test`.

**Suggested Label**: security
**Bounty:** $90
**ETA:** 48 hours

---

# [Bounty: $90] Revoke sessions server-side on sign-out

## Description

**Context**
`src/lib/session.ts:101-104` — `destroySession` only sets the cookie to
`maxAge: 0`. The row inserted by `createSession` (`:95`) is never deleted, and
`readSessionToken` (`:24-43`) keeps accepting the old HMAC token until the
30-day `MAX_AGE` (`:6`). A copied or stolen cookie therefore stays valid after
the user signs out, and `sessions` rows accumulate forever with no cleanup
path.

**Proposed Change**
Put a server-verifiable session identifier in the token (or maintain a
revocation list) so sign-out deletes/revokes that specific session, and
`getSession`/`loadUser` reject tokens whose row is gone or is on the revocation
list. Document how expired rows get swept (cron or opportunistic delete).

**Acceptance Criteria**

- Sign in → sign out → replaying the original cookie against `/api/profile`
  returns `401`.
- Other still-signed-in sessions for the same user are unaffected by one
  sign-out (unless you deliberately sign out everywhere — document the choice).
- Expired/revoked rows have a defined cleanup path.
- Test covers the replay-after-signout case.
- Verified by `npm test`.

**Suggested Label**: security
**Bounty:** $90
**ETA:** 36 hours

---

# [Bounty: $90] Origin-check state-changing routes instead of trusting `SameSite=Lax` alone

## Description

**Context**
`src/lib/session.ts:45-51` — the session cookie is `httpOnly` +
`sameSite: "lax"` (secure only in production). There is no `Origin`/
`Sec-Fetch-Site` validation, no custom-header requirement, and no CSRF token on
any mutating route (`PUT /api/profile`, `POST /api/auth/*`,
`POST /api/universities`, all `src/app/api/wallet/*`). Lax covers most
cross-site POSTs but leaves gaps: same-site subdomain attacks, top-level GET
navigations (note `GET /api/wallet/stellar` has side effects —
`markBalanceSynced` at `src/app/api/wallet/stellar/route.ts:39`), and older
clients.

**Proposed Change**
Add a shared helper that asserts `Origin`/`Referer` matches `HOST` (or that
`Sec-Fetch-Site: same-origin`) and apply it to every mutating route, returning
`403` on mismatch. Audit GET routes for side effects and either move those
effects behind POST or guard them with the same check.

**Acceptance Criteria**

- One shared helper; every state-changing route under `src/app/api/**` uses it.
- Foreign `Origin` → `403`; same-origin → passes; missing header handled
  deliberately (documented choice).
- GET routes with side effects are fixed or explicitly justified.
- Tests: foreign-origin request rejected, same-origin accepted.
- Verified by `npm test`.

**Suggested Label**: security
**Bounty:** $90
**ETA:** 48 hours

---

# [Bounty: $80] Bound all Horizon requests with timeouts

## Description

**Context**
`src/lib/chain/stellar.ts:51-57` — `horizon()` builds
`new Horizon.Server(STELLAR.horizonUrl)` with no timeout, and the SDK `.call()`
sites (operations history at `:315`, reconcile at `:759`, plus account/fee reads)
never pass an abort signal. One hung Horizon connection stalls the whole
dashboard request (`src/app/api/wallet/stellar/route.ts:37-38` awaits them in
the route) until the platform kills it. The gap is inconsistent: the friendbot
fetch already uses `AbortSignal.timeout(25_000)` (`stellar.ts:402`) and EVM uses
a 15s timeout (`evm.ts:186`) — only Stellar SDK reads are unbounded.

**Proposed Change**
Wrap every Horizon read with a ~10–15s timeout (SDK/axios timeout option or an
abort wrapper) that throws a typed, retryable `StellarError`. Degrade instead
of hanging: the overview response already has a `degraded` flag
(`wallet/stellar/route.ts:63`) — use it when a bounded call times out.

**Acceptance Criteria**

- No unbounded Horizon call remains (grep for `.call(` / `horizon()` usages).
- A fake server that never responds → the route answers `degraded`/`unavailable`
  within the bound (fake timers or short test timeout).
- Timeout errors are typed and marked retryable, consistent with
  `src/lib/chain/api.ts` error shape.
- Verified by `npm test`.

**Suggested Label**: reliability
**Bounty:** $80
**ETA:** 36 hours

---

# [Bounty: $80] Add test coverage for auth/profile API routes

## Description

**Context**
The suite is seven files (`tests/wallets, stellar, crypto, api-auth, evm,
decimal` + `tests/pages.test.tsx`) — the chain layer plus a page smoke test.
Nothing exercises `src/lib/session.ts`, `src/lib/auth.ts`
(`signUpWithEmail`/`signInWithEmail`/`cleanEmail`/`cleanText`), or
`src/app/api/profile/route.ts` — including the vulnerable `PUT` behavior in
issue #1. `tests/api-auth.test.ts` already demonstrates the house pattern:
mock `@/lib/db` and `@/lib/session` and drive `Request` objects directly, fully
offline.

**Proposed Change**
Add contract tests for the auth and profile routes using the existing mocking
pattern: no new network calls, no new dependencies beyond what vitest already
provides.

**Acceptance Criteria**

- Contract tests: duplicate-email sign-up, wrong-password sign-in, malformed
  body → `400`, unauthenticated GET/PUT `/api/profile` → `401`, authenticated
  PUT patch persists (mocked SQL).
- Unit tests for `cleanEmail`/`cleanText`/list validators (edge cases: casing,
  whitespace, oversized input).
- Coverage of `src/lib/auth.ts` and `src/app/api/profile/route.ts` is non-zero
  (`vitest --coverage`).
- Suite stays green and offline.
- Verified by `npm test`.

**Suggested Label**: testing
**Bounty:** $80
**ETA:** 48 hours

---

# [Bounty: $70] Unify the API error contract across routes

## Description

**Context**
Wallet routes return `{ ok:false, code, error, retryable }` via
`src/lib/chain/api.ts:35-46`, but every other route returns a bare
`{ error: "..." }` (`src/app/api/profile/route.ts:24,34,43,98,149`;
`src/app/api/universities/route.ts:40,43,49,56,59,76`). Clients must
special-case each family (`store.tsx:225` reads `{user?, error?}`), retryable
errors can't be surfaced uniformly outside the wallet, and error codes exist
only on half the API.

**Proposed Change**
Export a neutral `errorResponse(code, message, status, retryable)` helper from a
module that does *not* drag in chain code, and apply it to every route under
`src/app/api/**`. Keep the `error` field name so existing clients keep working;
add `code` and `retryable`.

**Acceptance Criteria**

- All API routes emit the same shape; no bare `{ error }` responses remain
  outside the shared helper.
- Wire-compatible: existing client reads of `error` still work.
- Contract note added to `README.md` or `docs/`.
- Tests assert the shape for one wallet route and one non-wallet route.
- Verified by `npm test`.

**Suggested Label**: dx
**Bounty:** $70
**ETA:** 36 hours

---

# [Bounty: $70] Remove the float fallback in `toAtomic`

## Description

**Context**
`src/lib/chain/decimal.ts:81-88` — `toAtomic` parses with `DECIMAL_RE` but on a
regex miss (`:84`) falls back to `parseDecimalFromFloat` (`:91-94`):
`BigInt(Math.round(value * 10 ** decimals))`. For JSON-number inputs this
reintroduces exactly the floating-point error the module exists to avoid —
values beyond 2^53 scaled lose precision at the wei/stroop boundary, and
`Math.round` can shift an amount by one atomic unit. Callers include balance
math in `stellar.ts:140`.

**Proposed Change**
Either reject non-string inputs with a typed error (check call sites first), or
convert number inputs exactly via `toString()` + `DECIMAL_RE` — never
`value * 10 ** decimals`. Valid string inputs must behave identically.

**Acceptance Criteria**

- No `Math.round(value * 10 ** decimals)` path remains.
- Existing `tests/decimal.test.ts` stays green (no behavioral change for valid
  strings).
- New tests: float-boundary inputs (`0.1`, `1e-7`, large amounts) yield exact
  `BigInt` results or explicit errors — never a silently rounded value.
- Verified by `npm test`.

**Suggested Label**: payments
**Bounty:** $70
**ETA:** 24 hours

---

# [Bounty: $70] Focus management for the shared `Modal`

## Description

**Context**
`src/components/ui.tsx:306-353` — the dialog sets `role="dialog"` /
`aria-modal` and handles Escape, but focus is never moved into it on open, there
is no Tab trap (keyboard users tab into the page behind the overlay), focus is
not restored to the trigger on close, and the backdrop is a `<button>` that
shows up as a stray tab stop. Because `Modal` is the shared primitive, every
dialog in the app inherits the defect.

**Proposed Change**
On open: move focus to the first focusable element (or the dialog container with
`tabIndex={-1}`); trap Tab/Shift+Tab inside; on close: restore focus to the
previously focused element. Make the backdrop non-focusable. Keep Escape and the
body scroll lock.

**Acceptance Criteria**

- Tab cycling stays inside the dialog while open; on close, focus returns to the
  element that opened it.
- Backdrop is not a tab stop; Escape and scroll lock unchanged.
- Test with `@testing-library/user-event` covering trap + restore (note:
  `vitest.config.mts` is `env: node` — enable jsdom for component tests or use a
  per-file env comment, and document the choice).
- Verified by `npm test`.

**Suggested Label**: accessibility
**Bounty:** $70
**ETA:** 36 hours

---

# [Bounty: $70] Stop the custom-university upsert from overwriting other users' rows

## Description

**Context**
`src/app/api/universities/route.ts:62-69` derives `id` purely from the name
(`c-<slug>`) and upserts with `on conflict (id) do update set name =
excluded.name`. Any authenticated user POSTing an existing name silently
rewrites the row created by someone else (`created_by` isn't touched either),
and `GET` at `:28-36` hands all custom rows to any caller with no auth. Users
therefore alter data shown to every other user. Separately, `region` is
hardcoded to `"Africa"` at `:20` and `:72` regardless of the actual country.

**Proposed Change**
On an id collision, return the existing row (or `409 already exists`) instead of
overwriting, and keep `created_by` immutable. Derive `region` from `country`
using the region grouping `src/lib/universities.ts` already implies. Consider
requiring auth for `GET` or rate-limiting it.

**Acceptance Criteria**

- Duplicate POST does not modify the original row's data or owner.
- A non-African country gets the correct region, not `"Africa"`.
- Tests: duplicate POST is a no-op/409; region derivation covered for at least
  two regions.
- Verified by `npm test`.

**Suggested Label**: bug
**Bounty:** $70
**ETA:** 24 hours

---

# [Bounty: $70] Reconcile pending transactions concurrently

## Description

**Context**
`src/app/api/wallet/stellar/route.ts:30-35` — a `for` loop awaits
`reconcileStellarTransaction` one row at a time (up to 25 rows), each doing its
own Horizon round-trip (`stellar.ts:759`) with the unbounded latency described in
issue #10. The identical serial pattern exists in
`src/app/api/wallet/evm/route.ts:20-25`. A dashboard load with several stuck
payments serializes up to 25 network calls before `accountSnapshot` and
`feeStats` (`:37`) even begin.

**Proposed Change**
Reconcile the pending subset with bounded concurrency (e.g. 5 at a time via a
tiny helper — no new dependency required), preserving per-row error isolation so
one failing reconciliation cannot reject the batch.

**Acceptance Criteria**

- All pending rows are still reconciled exactly once; one row throwing does not
  block or reject the others (current per-row `try/catch` semantics kept).
- Route latency measurably improves under a mocked 100ms-per-call Horizon
  (assert wall time < serial total in a test).
- Concurrency is bounded, not unbounded `Promise.all` over everything.
- Verified by `npm test`.

**Suggested Label**: performance
**Bounty:** $70
**ETA:** 24 hours

---

# [Bounty: $60] Add CI (lint + test + build) to pull requests

## Description

**Context**
There is no `.github/` directory in this repository — no workflow runs
`npm run lint`, `npm test` or `npm run build` on PRs. All three scripts already
exist and pass locally (`package.json`: `lint` via `eslint.config.mjs`, `test`
via `vitest run`, `build` via `next build --webpack`). Regressions are only
caught when a human remembers to run them.

**Proposed Change**
Add `.github/workflows/ci.yml` running on push and pull_request: setup Node
(20+; Node 20.9 is the floor per README), `npm ci`, `npm run lint`,
`npm test`, `npm run build`. The build must not require secrets — placeholders
are fine if Next needs env vars at build time.

**Acceptance Criteria**

- Workflow file exists and all three steps run on every PR.
- `npm run build` succeeds in a clean checkout without `DATABASE_URL`,
  `WALLET_MASTER_KEY` or `GOOGLE_CLIENT_SECRET`.
- Workflow is ready to be marked as a required status check.
- Verified by opening a PR and seeing green jobs.

**Suggested Label**: infrastructure
**Bounty:** $60
**ETA:** 12 hours

---

# [Bounty: $60] Close the sign-up account-enumeration oracle

## Description

**Context**
`src/lib/auth.ts:175` — `signUpWithEmail` returns "An Earnly account already
uses this email. Sign in instead." for an existing email but succeeds for a new
one, and `src/app/api/auth/email/route.ts` surfaces that message verbatim. With
no rate limiting (issue #7), the endpoint enumerates the entire user base:
registered vs unregistered is distinguishable in one request per address.

**Proposed Change**
Make the sign-up response identical regardless of prior existence — a uniform
"Check your email to continue"-style response (or an idempotent create that
returns a success-shaped body without leaking). Address the timing channel by
documenting it or equalizing the work path.

**Acceptance Criteria**

- Existing vs new email yield indistinguishable status codes and bodies on
  sign-up.
- Sign-in keeps its single shared failure message for unknown-email and
  bad-password (already the case at `auth.ts:208-215`).
- Test: enumeration attempt over a set of addresses produces no distinguishable
  difference (status + body).
- Verified by `npm test`.

**Suggested Label**: security
**Bounty:** $60
**ETA:** 18 hours

---

# [Bounty: $60] Landing page images, metadata and footer year

## Description

**Context**
Three gaps on the highest-traffic route:
1. `src/app/page.tsx` uses raw `<img>` tags (hero and sections) — no file in the
   repo imports `next/image`, so the marketing page ships no lazy-loading, no
   responsive sizing, and an oversized LCP hero.
2. The landing route exports no `metadata` — it inherits only the root
   title/description (`src/app/layout.tsx:5-9`); there is no page-level
   description, no `openGraph`/`twitter` image, and no `metadataBase` anywhere,
   so social shares render poorly.
3. `src/components/landing/SiteFooter.tsx:100` renders
   `© {new Date().getFullYear()}` — under static rendering the year freezes at
   build time.

**Proposed Change**
Convert the landing `<img>`s to `next/image` with explicit dimensions (priority
on the hero), add landing-level `metadata` plus `metadataBase` in the root
layout, and make the footer year render correctly on a static/revalidated page
(client component or `revalidate` — document the choice).

**Acceptance Criteria**

- No raw `<img>` on the landing route; hero keeps priority and shows no layout
  shift (CLS 0).
- Landing `metadata` (title, description, OG/twitter image) present;
  `metadataBase` set in the root layout.
- Footer year is correct in a production build served after a year rollover (or
  the approach is proven by test).
- `npm run build` passes.
- Verified by `npm run build && npm run start`.

**Suggested Label**: seo
**Bounty:** $60
**ETA:** 24 hours

---

# [Bounty: $50] Filter chips: `aria-pressed` + "Clear filters" clears everything

## Description

**Context**
Two defects in `src/components/Browse.tsx`:
1. The mode filter buttons (`:111-121`), category chips (`:125-135`) and
   minimum-pay chips (`:143-153`) convey selected state through classes only —
   no `aria-pressed`, so screen readers announce them as plain buttons with no
   state. The "Saved" toggle (`:100`) already models the right pattern, as do
   `cards.tsx:31` and `SkillsPicker.tsx:149`.
2. "Clear filters" (`:165-175`) resets `q`, `cat`, `mode` and `minPay` but not
   `savedOnly` — a user with Saved-only on still sees the empty state after
   "clearing", with no visible explanation. `sort`/`visible` should arguably
   reset too.

**Proposed Change**
Add `aria-pressed={active}` to all three chip groups (plus an `aria-label` where
the visible text is ambiguous), and make "Clear filters" reset every filter
state so the empty state disappears whenever results exist.

**Acceptance Criteria**

- Each chip group exposes `aria-pressed` correctly after interaction.
- "Clear filters" resets `savedOnly` (and `sort`/`visible`) so results reappear.
- Test: click a category → chip reports `aria-pressed="true"`; enable
  Saved-only → Clear filters → results render.
- Verified by `npm test` plus a keyboard/screen-reader spot check.

**Suggested Label**: accessibility
**Bounty:** $50
**ETA:** 12 hours
