import { NextResponse, type NextRequest } from "next/server";
import { cleanEmail, signInWithEmail, signUpWithEmail } from "@/lib/auth";
import { createSession, loadUser } from "@/lib/session";
import { databaseConfigured } from "@/lib/db";
import { provisionAfterSignIn } from "@/lib/chain/provisioning";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!databaseConfigured) {
    return NextResponse.json(
      { error: "Accounts are not configured on this deployment yet." },
      { status: 503 }
    );
  }
  let body: { mode?: string; email?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const email = cleanEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8) {
    return NextResponse.json({ error: "Use at least 8 characters for your password." }, { status: 400 });
  }

  try {
    const result =
      body.mode === "signin"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
    await createSession(result.userId, req.headers.get("user-agent"));
    await provisionAfterSignIn(result.userId);
    const user = await loadUser(result.userId);
    const next =
      user?.profile?.verification !== "verified"
        ? "/verify"
        : !user?.profile?.onboarded
          ? "/onboarding"
          : "/app";
    return NextResponse.json({ ok: true, next, user });
  } catch (error) {
    console.error("[earnly] email auth failed", error);
    return NextResponse.json(
      { error: "We could not reach the account service. Please try again." },
      { status: 500 }
    );
  }
}
