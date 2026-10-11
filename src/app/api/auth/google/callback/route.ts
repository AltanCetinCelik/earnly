import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeGoogleCode,
  googleIdentity,
  googleRedirectUri,
  upsertGoogleUser,
} from "@/lib/auth";
import { createSession, loadUser } from "@/lib/session";
import { provisionAfterSignIn } from "@/lib/chain/provisioning";

export const dynamic = "force-dynamic";

function back(site: string, path: string) {
  return NextResponse.redirect(`${site}${path}`);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const site = process.env.APP_URL || url.origin;
  const store = await cookies();
  const raw = store.get("earnly_oauth")?.value;
  store.set("earnly_oauth", "", { path: "/", maxAge: 0 });

  const denied = url.searchParams.get("error");
  if (denied) return back(site, "/signin?error=cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !raw) return back(site, "/signin?error=state_mismatch");

  let saved: { state?: string; verifier?: string };
  try {
    saved = JSON.parse(raw) as { state?: string; verifier?: string };
  } catch {
    return back(site, "/signin?error=state_mismatch");
  }
  if (!saved.state || saved.state !== state || !saved.verifier) {
    return back(site, "/signin?error=state_mismatch");
  }

  try {
    const tokens = await exchangeGoogleCode(code, saved.verifier, googleRedirectUri(url.origin));
    const identity = await googleIdentity(tokens.access_token);
    const userId = await upsertGoogleUser(identity);
    await createSession(userId, req.headers.get("user-agent"));
    // Provision the embedded wallets for this identity. Idempotent, and it
    // never throws into the sign-in path.
    await provisionAfterSignIn(userId);
    const user = await loadUser(userId);
    if (!user) return back(site, "/signin?error=google_failed");
    if (user.profile?.verification !== "verified") return back(site, "/verify");
    if (!user.profile?.onboarded) return back(site, "/onboarding");
    return back(site, "/app");
  } catch (error) {
    console.error("[earnly] google oauth failed", error);
    return back(site, "/signin?error=google_failed");
  }
}
