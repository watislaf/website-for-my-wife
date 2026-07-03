// Shared email validation used by the public /api/subscribe route. Deliberately
// pragmatic (not RFC-5322-complete): one @, non-empty local part, a dotted
// domain, no spaces. Good enough to reject obvious garbage without bouncing
// real addresses. Length-capped so a hostile caller can't POST a huge string.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    EMAIL_RE.test(value.trim())
  );
}

/** Normalize for storage: trim + lowercase so casing/whitespace don't create
 *  duplicate rows that dodge the unique constraint. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
