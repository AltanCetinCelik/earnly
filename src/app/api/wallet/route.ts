import { EVM, STELLAR } from "@/lib/chain/config";
import { errorResponse, okResponse, requireUser } from "@/lib/chain/api";
import { ensureAllWallets, listWallets, publicWallet } from "@/lib/chain/wallets";

export const dynamic = "force-dynamic";

/**
 * The wallet index for the signed-in student.
 *
 * `GET` is also the provisioning safety net: it creates any missing wallet for
 * this user. That is idempotent, so opening Payments repeatedly, refreshing or
 * redeploying never changes an address.
 */
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  try {
    const { failed } = await ensureAllWallets(guard.user.id);
    const rows = await listWallets(guard.user.id);
    return okResponse({
      wallets: rows.map(publicWallet),
      failed,
      networks: {
        stellar: { label: STELLAR.networkLabel, asset: STELLAR.asset.code },
        evm: { label: EVM.networkLabel, asset: EVM.asset.symbol, chainId: EVM.chainId },
      },
    });
  } catch (error) {
    console.error("[earnly] wallet index failed", (error as Error).message);
    return errorResponse("unavailable", "We could not load your wallets. Try again.", 500, true);
  }
}
