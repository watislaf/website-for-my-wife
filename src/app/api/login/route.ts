import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, createSessionToken } from "@/lib/session";

let failures = 0;
let lockUntil = 0;

export async function POST(req: Request) {
  if (Date.now() < lockUntil)
    return NextResponse.json({ error: "Too many attempts, wait a minute" }, { status: 429 });
  const { password } = await req.json();
  const ok = await bcrypt.compare(password ?? "", process.env.ADMIN_PASSWORD_HASH ?? "");
  if (!ok) {
    failures += 1;
    if (failures >= 5) { lockUntil = Date.now() + 60_000; failures = 0; }
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  failures = 0;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await createSessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
