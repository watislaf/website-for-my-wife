import { Sidebar } from "@/components/admin/Sidebar";
import { CommandK } from "@/components/admin/CommandK";
import { AchievementToaster } from "@/components/achievements/AchievementToaster";
import { getLandingContent } from "@/lib/site-content";
import { getAchievementsState } from "@/actions/achievements";

// Admin pages read live DB data but use no dynamic API (cookies/headers), so
// Next would otherwise prerender them static against the build-time DB. Force
// dynamic rendering across the whole /admin subtree so data is always fresh.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [content, { coins }] = await Promise.all([
    getLandingContent(),
    getAchievementsState(),
  ]);

  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar siteName={content.name} coins={coins} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
      <CommandK />
      <AchievementToaster />
    </div>
  );
}
