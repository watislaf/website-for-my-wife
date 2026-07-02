import { SignJWT, jwtVerify } from "jose";

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET!);
export const COOKIE_NAME = "session";

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(key());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, key());
    return true;
  } catch {
    return false;
  }
}
