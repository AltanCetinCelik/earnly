import { databaseConfigured } from "../db";
import { walletCryptoConfigured } from "./crypto";
import { ensureAllWallets } from "./wallets";

/**
 * Wallet provisioning is triggered from the trusted server-side auth flow, never
 * from a button in the browser: after Google (or email) sign-in the callback
 * calls `provisionAfterSignIn`, and `GET /api/wallet` re-runs it as a safety net
 * for accounts created before this feature existed.
 *
 * Provisioning is idempotent (unique on user + chain + network) and deliberately
 * never throws into the auth path: a wallet problem must not stop a student from
 * signing in. Failures surface in the Payments UI as a retryable state.
 */

export function walletsConfigured(): boolean {
  return databaseConfigured && walletCryptoConfigured();
}

export function walletConfigProblem(): string | null {
  if (!databaseConfigured) {
    return "The database is not configured on this deployment, so wallets are unavailable.";
  }
  if (!walletCryptoConfigured()) {
    return (
      "WALLET_MASTER_KEY is not configured, so wallet keys cannot be stored or used. " +
      "Set it in the environment to enable the wallet."
    );
  }
  return null;
}

export async function provisionAfterSignIn(userId: string): Promise<void> {
  if (!walletsConfigured()) return;
  try {
    const { failed } = await ensureAllWallets(userId);
    for (const entry of failed) {
      console.error(`[earnly] wallet provisioning failed (${entry.chain}): ${entry.error}`);
    }
  } catch (error) {
    console.error("[earnly] wallet provisioning failed", (error as Error).message);
  }
}
