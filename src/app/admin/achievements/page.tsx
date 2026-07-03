import { ACHIEVEMENTS } from "@/lib/achievements/catalog";
import { getAchievementsState } from "@/actions/achievements";
import { BadgeGrid } from "@/components/achievements/BadgeGrid";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";

export default async function AchievementsPage() {
  const { coins, earnedByKey } = await getAchievementsState();

  const total = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter(
    (a) => (earnedByKey[a.key]?.count ?? 0) >= 1,
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <Reveal onMount className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold heading-gradient">Achievements</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-semibold ring-1 ring-foreground/10">
            <span aria-hidden>🪙</span>
            <CountUp value={coins} /> coins
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-semibold ring-1 ring-foreground/10">
            <CountUp value={unlockedCount} /> / {total} unlocked
          </span>
        </div>
      </Reveal>

      <BadgeGrid earnedByKey={earnedByKey} />
    </div>
  );
}
