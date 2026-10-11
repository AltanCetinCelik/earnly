import { explorerTxUrl, type ChainId } from "./config";
import { evmActivity } from "./evm";
import { accountActivity } from "./stellar";
import { listTransactions, type TransactionRow, type WalletRow } from "./wallets";

/**
 * Wallet history is the network's history with our own records merged in.
 *
 * Horizon and the explorer are authoritative for anything that is on chain. The
 * application rows are merged on top so a payment we broadcast but have not yet
 * seen confirmed is still visible, and so a rejection the network never
 * published is not silently lost.
 */

export interface ActivityItem {
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
  /** "network" when the row came from Horizon/the explorer. */
  source: "network" | "app";
  /** True when the application also has a record for this hash. */
  recorded: boolean;
}

function fromRow(row: TransactionRow): ActivityItem {
  return {
    id: row.id,
    chain: row.chain,
    direction: row.direction,
    type: row.type,
    asset: row.asset,
    amount: row.amount,
    counterparty: row.counterparty,
    txHash: row.tx_hash,
    status: row.status,
    createdAt: row.created_at,
    explorerUrl: row.explorer_url ?? explorerTxUrl(row.chain, row.tx_hash),
    source: "app",
    recorded: true,
  };
}

function merge(network: ActivityItem[], rows: TransactionRow[]): ActivityItem[] {
  const byHash = new Map<string, TransactionRow>();
  for (const row of rows) {
    if (row.tx_hash) byHash.set(row.tx_hash.toLowerCase(), row);
  }

  const merged: ActivityItem[] = network.map((item) => {
    const row = item.txHash ? byHash.get(item.txHash.toLowerCase()) : undefined;
    if (!row) return item;
    byHash.delete(item.txHash!.toLowerCase());
    return {
      ...item,
      // The network wins on status unless it still has no opinion.
      status: item.status,
      recorded: true,
      explorerUrl: item.explorerUrl ?? row.explorer_url,
    };
  });

  // Anything we know about that the network view did not include: in-flight
  // submissions, failures, and transactions the explorer has not indexed yet.
  for (const row of byHash.values()) merged.push(fromRow(row));

  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return merged;
}

export async function stellarActivityFor(
  wallet: WalletRow,
  limit = 15
): Promise<{ items: ActivityItem[]; degraded: boolean }> {
  const rows = await listTransactions(wallet.user_id, "stellar", limit);
  let network: ActivityItem[] = [];
  let degraded = false;
  try {
    const raw = await accountActivity(wallet.address, limit);
    network = raw.map((item) => ({
      id: item.id,
      chain: "stellar" as const,
      direction: item.direction,
      type: item.type,
      asset: item.asset,
      amount: item.amount,
      counterparty: item.counterparty,
      txHash: item.txHash,
      status: item.status,
      createdAt: item.createdAt,
      explorerUrl: item.explorerUrl,
      source: "network" as const,
      recorded: false,
    }));
  } catch (error) {
    // A Horizon outage must not hide our own records.
    degraded = true;
    console.error("[earnly] stellar history unavailable", (error as Error).message);
  }
  return { items: merge(network, rows), degraded };
}

export async function evmActivityFor(
  wallet: WalletRow,
  limit = 15
): Promise<{ items: ActivityItem[]; degraded: boolean }> {
  const rows = await listTransactions(wallet.user_id, "evm", limit);
  let network: ActivityItem[] = [];
  let degraded = false;
  try {
    const raw = await evmActivity(wallet.address, limit);
    network = raw.map((item) => ({
      id: item.id,
      chain: "evm" as const,
      direction: item.direction,
      type: item.type,
      asset: item.asset,
      amount: item.amount,
      counterparty: item.counterparty,
      txHash: item.txHash,
      status: item.status,
      createdAt: item.createdAt,
      explorerUrl: item.explorerUrl,
      source: "network" as const,
      recorded: false,
    }));
  } catch (error) {
    degraded = true;
    console.error("[earnly] sepolia history unavailable", (error as Error).message);
  }
  return { items: merge(network, rows), degraded };
}
