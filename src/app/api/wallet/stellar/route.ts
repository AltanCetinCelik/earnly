import { STELLAR } from "@/lib/chain/config";
import { errorResponse, okResponse, requireUser } from "@/lib/chain/api";
import { stellarActivityFor } from "@/lib/chain/activity";
import {
  StellarError,
  accountSnapshot,
  feeStats,
  reconcileStellarTransaction,
} from "@/lib/chain/stellar";
import { ensureWallet, listTransactions, markBalanceSynced, publicWallet } from "@/lib/chain/wallets";

export const dynamic = "force-dynamic";

/**
 * Stellar Testnet dashboard payload: the address, live account state from
 * Horizon, the current fee, and merged activity.
 */
export async function GET(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const historyLimit = Math.min(Math.max(Number(url.searchParams.get("history") ?? 15) || 15, 1), 40);

  try {
    const wallet = await ensureWallet(guard.user.id, "stellar");

    // Resolve anything left in flight before reporting a status. Best effort:
    // a Horizon hiccup must not break the dashboard.
    const rows = await listTransactions(guard.user.id, "stellar", 25);
    for (const row of rows) {
      if ((row.status === "pending" || row.status === "unknown") && row.tx_hash) {
        await reconcileStellarTransaction(guard.user.id, row);
      }
    }

    const [account, fees] = await Promise.all([accountSnapshot(wallet.address), feeStats()]);
    const activity = await stellarActivityFor(wallet, historyLimit);
    await markBalanceSynced(wallet.id);

    return okResponse({
      wallet: publicWallet(wallet),
      network: {
        label: STELLAR.networkLabel,
        horizon: STELLAR.horizonUrl,
        asset: STELLAR.asset.code,
        explorer: STELLAR.explorerAccount,
        friendbot: STELLAR.friendbotUrl,
      },
      account: {
        exists: account.exists,
        funded: account.funded,
        xlmBalance: account.xlmBalance,
        balances: account.balances,
        subentries: account.subentries,
        minimumBalanceXlm: account.minimumBalanceXlm,
        spendableXlm: account.spendableXlm,
        sequence: account.sequence,
        lastModifiedLedger: account.lastModifiedLedger,
      },
      fees,
      activity: activity.items,
      degraded: activity.degraded,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof StellarError) {
      return errorResponse(error.code, error.message, error.retryable ? 503 : 400, error.retryable);
    }
    console.error("[earnly] stellar overview failed", (error as Error).message);
    return errorResponse("unavailable", "We could not load your Stellar wallet.", 500, true);
  }
}
