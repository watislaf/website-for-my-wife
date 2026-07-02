import { SignJWT, jwtVerify } from "jose";

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("SESSION_SECRET must be set and at least 32 chars");
}
const key = () => new TextEncoder().encode(secret);
export const COOKIE_NAME = "session";

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(key());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}
