import type { Metadata } from "next";

// Login is a client component and can't export metadata itself, so this server
// layout carries it. Only /login is deindexed — the rest of the site stays crawlable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
