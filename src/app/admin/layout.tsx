import { Sidebar } from "@/components/admin/Sidebar";
import { CommandK } from "@/components/admin/CommandK";

// Admin pages read live DB data but use no dynamic API (cookies/headers), so
// Next would otherwise prerender them static against the build-time DB. Force
// dynamic rendering across the whole /admin subtree so data is always fresh.
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">{children}</main>
      <CommandK />
    </div>
  );
}
