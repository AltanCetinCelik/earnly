import { EVM } from "@/lib/chain/config";
import { errorResponse, okResponse, requireUser } from "@/lib/chain/api";
import { evmActivityFor } from "@/lib/chain/activity";
import { EvmError, assertSepolia, evmSnapshot, reconcileEvmTransaction } from "@/lib/chain/evm";
import { ensureWallet, listTransactions, markBalanceSynced, publicWallet } from "@/lib/chain/wallets";

export const dynamic = "force-dynamic";

/** Ethereum Sepolia dashboard payload: address, live balance and activity. */
export async function GET(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const historyLimit = Math.min(Math.max(Number(url.searchParams.get("history") ?? 15) || 15, 1), 40);

  try {
    const wallet = await ensureWallet(guard.user.id, "evm");

    const rows = await listTransactions(guard.user.id, "evm", 25);
    for (const row of rows) {
      if ((row.status === "pending" || row.status === "unknown") && row.tx_hash) {
        await reconcileEvmTransaction(row.id, row.tx_hash);
      }
    }

    await assertSepolia();
    const snapshot = await evmSnapshot(wallet.address);
    const activity = await evmActivityFor(wallet, historyLimit);
    await markBalanceSynced(wallet.id);

    return okResponse({
      wallet: publicWallet(wallet),
      network: {
        label: EVM.networkLabel,
        chainId: EVM.chainId,
        explorer: EVM.explorerAccount,
        faucets: EVM.faucets,
        asset: EVM.asset.symbol,
      },
      account: {
        exists: true,
        balanceWei: snapshot.balanceWei,
        balanceEth: snapshot.balanceEth,
        spendableWei: snapshot.spendableWei,
        spendableEth: snapshot.spendableEth,
        nonce: snapshot.nonce,
        blockNumber: snapshot.blockNumber,
        gasPriceWei: snapshot.gasPriceWei,
      },
      activity: activity.items,
      degraded: activity.degraded,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof EvmError) {
      return errorResponse(error.code, error.message, error.retryable ? 503 : 400, error.retryable);
    }
    console.error("[earnly] evm overview failed", (error as Error).message);
    return errorResponse("unavailable", "We could not load your Sepolia wallet.", 500, true);
  }
}
