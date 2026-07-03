import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  type AchievementDef,
  type Category,
} from "@/lib/achievements/catalog";
import { getAchievementsState } from "@/actions/achievements";
import { cn } from "@/lib/utils";

/**
 * Format an earned timestamp for display. Rows are written by the DB via
 * `datetime('now')` → a UTC "YYYY-MM-DD HH:MM:SS" string. We only surface the
 * date part and format it locally (no toISOString round-trip).
 */
function formatEarnedDate(ts: string): string {
  const datePart = ts.slice(0, 10); // "YYYY-MM-DD"
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return datePart;
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Earned = { count: number; firstEarnedAt: string; lastEarnedAt: string };

function BadgeCard({
  def,
  earned,
}: {
  def: AchievementDef;
  earned: Earned | undefined;
}) {
  const unlocked = (earned?.count ?? 0) >= 1;
  const src = `/badges/${def.key}.svg`;

  if (!unlocked) {
    return (
      <div
        title={def.hint}
        className="flex flex-col items-center gap-2 rounded-xl bg-card px-3 py-4 text-center ring-1 ring-foreground/10 opacity-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Locked achievement"
          className="size-16 md:size-20 [filter:brightness(0)_opacity(0.22)]"
        />
        <span className="text-sm font-semibold text-muted-foreground">???</span>
        <span className="text-xs text-muted-foreground line-clamp-3">
          {def.hint}
        </span>
        <span className="mt-auto text-xs font-medium text-muted-foreground/80">
          🪙 {def.coins}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-card px-3 py-4 text-center ring-2 ring-primary/40 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={def.name}
        className="size-16 md:size-20 drop-shadow-sm"
      />
      <span className="text-sm font-semibold leading-snug">
        {def.name}
        {earned!.count > 1 && (
          <span className="ml-1 text-xs font-medium text-primary">
            ×{earned!.count}
          </span>
        )}
      </span>
      <span className="text-xs text-muted-foreground line-clamp-3">
        {def.description}
      </span>
      <div className="mt-auto flex flex-col items-center gap-0.5">
        <span className="text-xs font-semibold text-primary">
          🪙 {def.coins}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatEarnedDate(earned!.lastEarnedAt)}
        </span>
      </div>
    </div>
  );
}

export default async function AchievementsPage() {
  const { coins, earnedByKey } = await getAchievementsState();

  const total = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter(
    (a) => (earnedByKey[a.key]?.count ?? 0) >= 1,
  ).length;

  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold heading-gradient">Achievements</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-semibold ring-1 ring-foreground/10">
            <span aria-hidden>🪙</span>
            {coins.toLocaleString()} coins
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-semibold ring-1 ring-foreground/10">
            {unlockedCount} / {total} unlocked
          </span>
        </div>
      </div>

      {categories.map((category) => {
        const defs = ACHIEVEMENTS.filter((a) => a.category === category);
        if (defs.length === 0) return null;
        return (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{CATEGORY_LABELS[category]}</h2>
            <div
              className={cn(
                "grid gap-3",
                "grid-cols-3 sm:grid-cols-4 md:grid-cols-6",
              )}
            >
              {defs.map((def) => (
                <BadgeCard
                  key={def.key}
                  def={def}
                  earned={earnedByKey[def.key]}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
