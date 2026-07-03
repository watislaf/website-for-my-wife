/* Shared date + number formatting helpers for the work tracker.
   LOCAL date parts only — never toISOString (avoids UTC off-by-one). */

export function dateToStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function strToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function prettyDate(s: string): string {
  return strToDate(s).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtMoney(n: number): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtHours(n: number): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} h`;
}
