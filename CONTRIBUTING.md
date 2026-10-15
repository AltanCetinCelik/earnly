# Contributing to Earnly

Earnly pays bounty rewards for the issues labelled in
<https://github.com/Earnly-Build/earnly/issues>. The full catalogue and the
reasoning behind each issue lives in [`BOUNTIES.md`](./BOUNTIES.md).

## Ground rules

- One open claim at a time. Comment `/claim #<issue>` on the issue you are
  taking; first claim gets it unless a maintainer says otherwise.
- Post the wallet you want paid in your claim comment (Base USDC, EVM address).
- Stay inside the issue's scope. If the work reveals a bigger problem, open a new
  issue instead of expanding the PR.
- Every PR must keep `npm run lint`, `npm test` and `npm run build` green.
- New behavior needs a test. Issues that say "Verified by `npm test`" mean it
  literally — an untested PR will be closed.
- Reference the issue in the PR description (`Fixes #<n>`) so merge closes it.

## Claiming a bounty

1. Find an unclaimed issue that fits you. The `good first issue` label is the
   on-ramp; the $100+ issues expect prior experience with the area.
2. Comment: `/claim #12` plus your settlement wallet (Base USDC).
3. Do the work on a branch off `main`, open a PR that says `Fixes #12`.
4. A maintainer reviews. Address review comments promptly; stale claims (no
   activity for 5 days) get released back to the pool.
5. On merge, the bounty in the issue title is paid to the wallet from your
   claim comment. No invoice, no forms.

## Review bar

A good PR for this repo:

- Follows the existing code style (read neighboring files before writing).
- Touches only what the acceptance criteria demand.
- Adds tests that would fail without the change.
- Leaves `BOUNTIES.md` and issue text alone unless the issue says otherwise.

## Local development

See the README for setup (`npm install`, `npm run dev`, env vars). Tests are
offline by design — mock `@/lib/db`, never hit Neon or a live chain in tests.

## Code of conduct

Be respectful in issues and reviews. Maintainers reserve the right to
disqualify conduct-violating contributors from all current and future bounties.
