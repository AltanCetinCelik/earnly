import { errorResponse, okResponse, requireUser } from "@/lib/chain/api";
import { ensureAllWallets, listWallets, publicWallet } from "@/lib/chain/wallets";

export const dynamic = "force-dynamic";

/** Explicit retry for a wallet whose provisioning previously failed. */
export async function POST() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { failed } = await ensureAllWallets(guard.user.id);
  if (failed.length) {
    return errorResponse(
      "provisioning_failed",
      `Could not provision: ${failed.map((f) => f.chain).join(", ")}.`,
      502,
      true
    );
  }
  const rows = await listWallets(guard.user.id);
  return okResponse({ wallets: rows.map(publicWallet) });
}
