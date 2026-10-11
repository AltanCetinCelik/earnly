import { NextResponse } from "next/server";
import { databaseConfigured } from "../db";
import { getSession, type SessionUser } from "../session";
import { walletConfigProblem } from "./provisioning";

/**
 * Shared guards for the wallet API. Every wallet route resolves the user from
 * the signed session cookie and works only with that user's rows: no route
 * accepts a user id, address or wallet id from the client.
 */

export type Guarded = { ok: true; user: SessionUser } | { ok: false; response: NextResponse };

export async function requireUser(): Promise<Guarded> {
  if (!databaseConfigured) {
    return { ok: false, response: errorResponse("unavailable", "Accounts are not configured on this deployment yet.", 503) };
  }
  let user: SessionUser | null = null;
  try {
    user = await getSession();
  } catch (error) {
    console.error("[earnly] wallet session lookup failed", (error as Error).message);
    return { ok: false, response: errorResponse("unavailable", "We could not verify your session. Try signing in again.", 503, true) };
  }
  if (!user) {
    return { ok: false, response: errorResponse("unauthorized", "Sign in to use your wallet.", 401) };
  }
  const problem = walletConfigProblem();
  if (problem) {
    return { ok: false, response: errorResponse("unconfigured", problem, 503) };
  }
  return { ok: true, user };
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  retryable = false
): NextResponse {
  return NextResponse.json({ ok: false, code, error: message, retryable }, { status });
}

export function okResponse<T extends object>(payload: T): NextResponse {
  return NextResponse.json({ ok: true, ...payload });
}

/** Reads a JSON body without ever throwing on malformed input. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object") return body as Record<string, unknown>;
  } catch {
    /* fall through to an empty object */
  }
  return {};
}

export function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value : "";
}

export function readKey(body: Record<string, unknown>): string | null {
  const raw = body.idempotencyKey;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 120) return null;
  return trimmed;
}
