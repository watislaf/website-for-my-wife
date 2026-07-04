// Achievement CATALOG — pure DATA + types. No DB / server-only imports so this
// module is importable from BOTH client and server components. No side effects
// at import time.
//
// The (separately built) engine computes metrics from the DB and matches them
// against these definitions. Definitions may ONLY reference the fixed metric ids
// declared in `MetricId` below — the engine implements exactly those.
//
// Coins convention: tier I = 10, II = 25, III = 50, IV = 100; milestones = 5.
// Repeatable (non-global scope) achievements award their tier's coins per earn.
//
// Badge asset convention: each `key` implies `public/badges/<key>.svg`.
//
// DEV NOTE: every `key` MUST be unique. There is intentionally NO runtime assert
// here (it must not throw on import). See the `achievements.catalog.test.ts`
// suite / the engine's dev checks for uniqueness verification.

export type Category =
  | "work"
  | "earnings"
  | "consistency"
  | "planner"
  | "audience"
  | "milestones";

export type Scope = "global" | "period" | "source" | "day";

// Optional flashy CSS effect rendered around a badge when it's displayed.
// Purely cosmetic — reserved for the rarest / most fun achievements so the
// grid doesn't turn into a light show. See `.badge-fx--<effect>` in globals.css.
export type BadgeEffect =
  | "glow"
  | "fire"
  | "electric"
  | "rainbow"
  | "rainbow-rain"
  | "gold"
  | "holo"
  | "frost"
  | "aurora"
  | "cosmic"
  | "toxic"
  | "neon"
  | "sparkle"
  | "heartbeat"
  | "shadow";

// Union of EXACTLY the fixed metric ids the engine implements.
export type MetricId =
  // GLOBAL (one-time; earned once when value >= threshold)
  | "total_entries"
  | "total_hours"
  | "total_earnings"
  | "total_days_worked"
  | "sources_created"
  | "periods_closed"
  | "goals_created"
  | "total_goal_checks"
  | "best_current_streak"
  | "best_ever_streak"
  | "total_plan_done"
  | "total_pageviews"
  | "total_clicks"
  | "distinct_traffic_sources"
  | "subscribers"
  | "best_hourly_rate"
  | "total_coins"
  // SETUP / ONBOARDING (global one-time; landing-page setup flags)
  | "landing_name_set"
  | "landing_about_set"
  | "landing_photo_uploaded"
  | "landing_social_set"
  | "landing_section_enabled"
  | "landing_setup_complete"
  // INSTANCE (repeatable; earned once per instance whose value >= threshold)
  | "period_hours" // scope "period"
  | "period_earnings" // scope "period"
  | "source_earnings" // scope "source"
  | "perfect_day" // scope "day"; value is 1 when ALL active goals checked
  | "day_pageviews"; // scope "day"

export type AchievementDef = {
  /** Unique kebab id, e.g. "hard-worker-1"; badge file = public/badges/<key>.svg */
  key: string;
  /** Family id shared by tiers, e.g. "hard-worker". */
  group: string;
  /** 1..N within the group (1 for single/milestone). */
  tier: number;
  /** Display name, e.g. "Hard Worker I". */
  name: string;
  /** Human description, e.g. "Work 80h in a single period". */
  description: string;
  /** Shown while locked (teaser, may omit exact number). */
  hint: string;
  category: Category;
  metric: MetricId;
  /** "global" = one-time; others = repeatable per instance. */
  scope: Scope;
  threshold: number;
  coins: number;
  /** Optional cosmetic CSS effect shown around the badge (see BadgeEffect). */
  effect?: BadgeEffect;
};

// Coin values by tier (I..IV) and for milestones.
const TIER_COINS = [10, 25, 50, 100] as const;
const MILESTONE_COINS = 5;
const ROMAN = ["I", "II", "III", "IV", "V"] as const;

/**
 * Build a tiered family from parallel arrays of thresholds/descriptions/hints.
 * Coins are assigned by tier position (I=10, II=25, III=50, IV=100).
 */
function family(cfg: {
  group: string;
  baseName: string; // e.g. "Hard Worker"
  category: Category;
  metric: MetricId;
  scope: Scope;
  tiers: { threshold: number; description: string; hint: string }[];
}): AchievementDef[] {
  return cfg.tiers.map((t, i) => ({
    key: `${cfg.group}-${i + 1}`,
    group: cfg.group,
    tier: i + 1,
    name: `${cfg.baseName} ${ROMAN[i]}`,
    description: t.description,
    hint: t.hint,
    category: cfg.category,
    metric: cfg.metric,
    scope: cfg.scope,
    threshold: t.threshold,
    coins: TIER_COINS[i] ?? TIER_COINS[TIER_COINS.length - 1],
  }));
}

/** A one-off milestone (tier 1, threshold 1, small coins). */
function milestone(cfg: {
  key: string;
  name: string;
  description: string;
  hint: string;
  metric: MetricId;
}): AchievementDef {
  return {
    key: cfg.key,
    group: cfg.key,
    tier: 1,
    name: cfg.name,
    description: cfg.description,
    hint: cfg.hint,
    category: "milestones",
    metric: cfg.metric,
    scope: "global",
    threshold: 1,
    coins: MILESTONE_COINS,
  };
}

const RAW_ACHIEVEMENTS: AchievementDef[] = [
  // ── WORK ────────────────────────────────────────────────────────────────
  ...family({
    group: "hard-worker",
    baseName: "Hard Worker",
    category: "work",
    metric: "period_hours",
    scope: "period",
    tiers: [
      { threshold: 40, description: "Log 40 hours in a single period.", hint: "Put in a solid shift across one period." },
      { threshold: 80, description: "Log 80 hours in a single period.", hint: "Put in serious hours in one period." },
      { threshold: 120, description: "Log 120 hours in a single period.", hint: "Pour real dedication into one period." },
      { threshold: 160, description: "Log 160 hours in a single period.", hint: "Go all-in for an entire period." },
    ],
  }),
  ...family({
    group: "marathoner",
    baseName: "Marathoner",
    category: "work",
    metric: "total_hours",
    scope: "global",
    tiers: [
      { threshold: 100, description: "Log 100 total hours worked.", hint: "Rack up your first hundred hours." },
      { threshold: 500, description: "Log 500 total hours worked.", hint: "Keep the hours piling up." },
      { threshold: 1000, description: "Log 1,000 total hours worked.", hint: "Join the four-figure hours club." },
      { threshold: 2500, description: "Log 2,500 total hours worked.", hint: "Reach a truly epic hour count." },
    ],
  }),
  ...family({
    group: "grinder",
    baseName: "Grinder",
    category: "work",
    metric: "total_days_worked",
    scope: "global",
    tiers: [
      { threshold: 10, description: "Work on 10 distinct days.", hint: "Show up day after day." },
      { threshold: 50, description: "Work on 50 distinct days.", hint: "Build a real habit of showing up." },
      { threshold: 150, description: "Work on 150 distinct days.", hint: "Show up relentlessly." },
      { threshold: 365, description: "Work on 365 distinct days.", hint: "A full year's worth of working days." },
    ],
  }),

  // ── EARNINGS ─────────────────────────────────────────────────────────────
  ...family({
    group: "big-payday",
    baseName: "Big Payday",
    category: "earnings",
    metric: "period_earnings",
    scope: "period",
    tiers: [
      { threshold: 500, description: "Earn 500 in a single period.", hint: "Have a decent payday in one period." },
      { threshold: 1500, description: "Earn 1,500 in a single period.", hint: "Cash in big during one period." },
      { threshold: 3000, description: "Earn 3,000 in a single period.", hint: "Make one period really count." },
      { threshold: 6000, description: "Earn 6,000 in a single period.", hint: "Have a blowout period." },
    ],
  }),
  ...family({
    group: "loyal-client",
    baseName: "Loyal Client",
    category: "earnings",
    metric: "source_earnings",
    scope: "source",
    tiers: [
      { threshold: 1000, description: "Earn 1,000 total from a single source.", hint: "Grow a paying relationship." },
      { threshold: 5000, description: "Earn 5,000 total from a single source.", hint: "Turn one source into a steady stream." },
      { threshold: 15000, description: "Earn 15,000 total from a single source.", hint: "Build a major client relationship." },
      { threshold: 40000, description: "Earn 40,000 total from a single source.", hint: "Land a truly loyal client." },
    ],
  }),
  ...family({
    group: "breadwinner",
    baseName: "Breadwinner",
    category: "earnings",
    metric: "total_earnings",
    scope: "global",
    tiers: [
      { threshold: 1000, description: "Earn 1,000 in total earnings.", hint: "Bank your first thousand." },
      { threshold: 10000, description: "Earn 10,000 in total earnings.", hint: "Cross into five figures." },
      { threshold: 50000, description: "Earn 50,000 in total earnings.", hint: "Reach a serious lifetime total." },
      { threshold: 100000, description: "Earn 100,000 in total earnings.", hint: "Join the six-figure club." },
    ],
  }),
  ...family({
    group: "high-roller",
    baseName: "High Roller",
    category: "earnings",
    metric: "best_hourly_rate",
    scope: "global",
    tiers: [
      { threshold: 20, description: "Reach a best hourly rate of 20.", hint: "Make your time pay off." },
      { threshold: 50, description: "Reach a best hourly rate of 50.", hint: "Command a stronger rate." },
      { threshold: 100, description: "Reach a best hourly rate of 100.", hint: "Charge like a pro." },
      { threshold: 200, description: "Reach a best hourly rate of 200.", hint: "Reach premium territory." },
    ],
  }),

  // ── CONSISTENCY ─────────────────────────────────────────────────────────
  ...family({
    group: "streak-master",
    baseName: "Streak Master",
    category: "consistency",
    metric: "best_current_streak",
    scope: "global",
    tiers: [
      { threshold: 3, description: "Reach a current goal streak of 3 days.", hint: "Get a little streak going." },
      { threshold: 7, description: "Reach a current goal streak of 7 days.", hint: "Keep a streak alive for a week." },
      { threshold: 30, description: "Reach a current goal streak of 30 days.", hint: "Hold a streak for a full month." },
      { threshold: 100, description: "Reach a current goal streak of 100 days.", hint: "Never miss for a hundred days." },
    ],
  }),
  ...family({
    group: "legendary-streak",
    baseName: "Legendary Streak",
    category: "consistency",
    metric: "best_ever_streak", // uses the one otherwise-unused fixed metric id
    scope: "global",
    tiers: [
      { threshold: 30, description: "Set an all-time best goal streak of 30 days.", hint: "Beat your own streak record." },
      { threshold: 100, description: "Set an all-time best goal streak of 100 days.", hint: "Etch a legendary streak into history." },
    ],
  }),
  ...family({
    group: "consistency",
    baseName: "Consistency",
    category: "consistency",
    metric: "total_goal_checks",
    scope: "global",
    tiers: [
      { threshold: 10, description: "Complete 10 goal check-ins.", hint: "Start checking in on your goals." },
      { threshold: 50, description: "Complete 50 goal check-ins.", hint: "Make check-ins a routine." },
      { threshold: 200, description: "Complete 200 goal check-ins.", hint: "Become a check-in machine." },
      { threshold: 500, description: "Complete 500 goal check-ins.", hint: "Reach an elite check-in count." },
    ],
  }),
  {
    key: "perfect-day",
    group: "perfect-day",
    tier: 1,
    name: "Perfect Day",
    description: "Check in on every active goal in a single day.",
    hint: "Nail all of your goals in one day.",
    category: "consistency",
    metric: "perfect_day",
    scope: "day",
    threshold: 1,
    coins: TIER_COINS[0],
  },

  // ── PLANNER ─────────────────────────────────────────────────────────────
  ...family({
    group: "planner-pro",
    baseName: "Planner Pro",
    category: "planner",
    metric: "total_plan_done",
    scope: "global",
    tiers: [
      { threshold: 10, description: "Complete 10 plan items.", hint: "Start ticking off your plan." },
      { threshold: 50, description: "Complete 50 plan items.", hint: "Keep knocking out tasks." },
      { threshold: 200, description: "Complete 200 plan items.", hint: "Become a planning powerhouse." },
      { threshold: 500, description: "Complete 500 plan items.", hint: "Master the art of getting things done." },
    ],
  }),
  ...family({
    group: "dreamer",
    baseName: "Dreamer",
    category: "planner",
    metric: "goals_created",
    scope: "global",
    tiers: [
      { threshold: 3, description: "Create 3 goals.", hint: "Set a few goals to chase." },
      { threshold: 10, description: "Create 10 goals.", hint: "Build out an ambitious slate of goals." },
      { threshold: 25, description: "Create 25 goals.", hint: "Dream big across many goals." },
    ],
  }),
  ...family({
    group: "closer",
    baseName: "Closer",
    category: "planner",
    metric: "periods_closed",
    scope: "global",
    tiers: [
      { threshold: 3, description: "Close 3 periods.", hint: "Wrap up a few periods." },
      { threshold: 12, description: "Close 12 periods.", hint: "Keep closing your books." },
      { threshold: 36, description: "Close 36 periods.", hint: "Close periods like clockwork." },
    ],
  }),
  ...family({
    group: "portfolio",
    baseName: "Portfolio",
    category: "planner",
    metric: "sources_created",
    scope: "global",
    tiers: [
      { threshold: 2, description: "Create 2 income sources.", hint: "Add a second income source." },
      { threshold: 5, description: "Create 5 income sources.", hint: "Diversify your income sources." },
      { threshold: 10, description: "Create 10 income sources.", hint: "Build a broad income portfolio." },
    ],
  }),

  // ── AUDIENCE ────────────────────────────────────────────────────────────
  ...family({
    group: "famous",
    baseName: "Famous",
    category: "audience",
    metric: "total_pageviews",
    scope: "global",
    tiers: [
      { threshold: 100, description: "Reach 100 total pageviews.", hint: "Get your first crowd of visitors." },
      { threshold: 1000, description: "Reach 1,000 total pageviews.", hint: "Draw a real audience." },
      { threshold: 10000, description: "Reach 10,000 total pageviews.", hint: "Go big on visitors." },
      { threshold: 100000, description: "Reach 100,000 total pageviews.", hint: "Become genuinely famous." },
    ],
  }),
  ...family({
    group: "engager",
    baseName: "Engager",
    category: "audience",
    metric: "total_clicks",
    scope: "global",
    tiers: [
      { threshold: 25, description: "Collect 25 total clicks.", hint: "Get visitors clicking." },
      { threshold: 250, description: "Collect 250 total clicks.", hint: "Turn views into clicks." },
      { threshold: 2500, description: "Collect 2,500 total clicks.", hint: "Drive strong engagement." },
      { threshold: 25000, description: "Collect 25,000 total clicks.", hint: "Master audience engagement." },
    ],
  }),
  ...family({
    group: "mailing-list",
    baseName: "Mailing List",
    category: "audience",
    metric: "subscribers",
    scope: "global",
    tiers: [
      { threshold: 10, description: "Reach 10 subscribers.", hint: "Grow your first handful of subscribers." },
      { threshold: 100, description: "Reach 100 subscribers.", hint: "Build a real subscriber base." },
      { threshold: 1000, description: "Reach 1,000 subscribers.", hint: "Grow a sizeable mailing list." },
      { threshold: 10000, description: "Reach 10,000 subscribers.", hint: "Command a huge mailing list." },
    ],
  }),
  ...family({
    group: "diversified",
    baseName: "Diversified",
    category: "audience",
    metric: "distinct_traffic_sources",
    scope: "global",
    tiers: [
      { threshold: 3, description: "Attract traffic from 3 distinct sources.", hint: "Pull visitors from a few places." },
      { threshold: 6, description: "Attract traffic from 6 distinct sources.", hint: "Spread across many channels." },
      { threshold: 10, description: "Attract traffic from 10 distinct sources.", hint: "Reach visitors everywhere." },
    ],
  }),
  ...family({
    group: "viral-day",
    baseName: "Viral Day",
    category: "audience",
    metric: "day_pageviews",
    scope: "day",
    tiers: [
      { threshold: 100, description: "Get 100 pageviews in a single day.", hint: "Have a busy day of visitors." },
      { threshold: 1000, description: "Get 1,000 pageviews in a single day.", hint: "Have a day that pops off." },
      { threshold: 10000, description: "Get 10,000 pageviews in a single day.", hint: "Go viral for a day." },
    ],
  }),

  // ── MILESTONES ──────────────────────────────────────────────────────────
  milestone({
    key: "first-dollar",
    name: "First Dollar",
    description: "Log your first work entry.",
    hint: "Record your very first entry.",
    metric: "total_entries",
  }),
  milestone({
    key: "first-goal",
    name: "First Goal",
    description: "Create your first goal.",
    hint: "Set your first goal.",
    metric: "goals_created",
  }),
  milestone({
    key: "first-check-in",
    name: "First Check-in",
    description: "Complete your first goal check-in.",
    hint: "Check in on a goal for the first time.",
    metric: "total_goal_checks",
  }),
  milestone({
    key: "first-period-closed",
    name: "First Period Closed",
    description: "Close your first period.",
    hint: "Wrap up your first period.",
    metric: "periods_closed",
  }),
  milestone({
    key: "first-fan",
    name: "First Fan",
    description: "Receive your first pageview.",
    hint: "Get your very first visitor.",
    metric: "total_pageviews",
  }),
  milestone({
    key: "first-click",
    name: "First Click",
    description: "Receive your first click.",
    hint: "Get someone to click for the first time.",
    metric: "total_clicks",
  }),
  milestone({
    key: "first-subscriber",
    name: "First Subscriber",
    description: "Gain your first subscriber.",
    hint: "Sign up your first subscriber.",
    metric: "subscribers",
  }),
  milestone({
    key: "first-task-done",
    name: "First Task Done",
    description: "Complete your first plan item.",
    hint: "Tick off your first task.",
    metric: "total_plan_done",
  }),

  // ── MILESTONES: SETUP / ONBOARDING (landing-page setup) ───────────────────
  {
    key: "made-it-yours",
    group: "setup",
    tier: 1,
    name: "Made It Yours",
    description: "Set your name on the landing page.",
    hint: "Put your name on it.",
    category: "milestones",
    metric: "landing_name_set",
    scope: "global",
    threshold: 1,
    coins: 5,
  },
  {
    key: "storyteller",
    group: "setup",
    tier: 1,
    name: "Storyteller",
    description: "Write your About section.",
    hint: "Tell your story.",
    category: "milestones",
    metric: "landing_about_set",
    scope: "global",
    threshold: 1,
    coins: 5,
  },
  {
    key: "say-cheese",
    group: "setup",
    tier: 1,
    name: "Say Cheese",
    description: "Upload your first custom photo.",
    hint: "Add a real photo.",
    category: "milestones",
    metric: "landing_photo_uploaded",
    scope: "global",
    threshold: 1,
    coins: 5,
  },
  {
    key: "get-social",
    group: "setup",
    tier: 1,
    name: "Get Social",
    description: "Add a real social link.",
    hint: "Link a social account.",
    category: "milestones",
    metric: "landing_social_set",
    scope: "global",
    threshold: 1,
    coins: 5,
  },
  {
    key: "show-and-tell",
    group: "setup",
    tier: 1,
    name: "Show & Tell",
    description: "Enable a landing section.",
    hint: "Turn on a section.",
    category: "milestones",
    metric: "landing_section_enabled",
    scope: "global",
    threshold: 1,
    coins: 5,
  },
  {
    key: "all-set-up",
    group: "setup",
    tier: 1,
    name: "All Set Up",
    description: "Finish the core landing setup (name, photo, and a social link).",
    hint: "Complete your setup.",
    category: "milestones",
    metric: "landing_setup_complete",
    scope: "global",
    threshold: 1,
    coins: 20,
  },

  // ── MILESTONES: meta / coins (kept in milestones so it stays balanced) ────
  ...family({
    group: "rich",
    baseName: "Rich",
    category: "milestones",
    metric: "total_coins",
    scope: "global",
    tiers: [
      { threshold: 100, description: "Earn 100 coins in total.", hint: "Start stacking coins." },
      { threshold: 500, description: "Earn 500 coins in total.", hint: "Build up a coin fortune." },
      { threshold: 2000, description: "Earn 2,000 coins in total.", hint: "Become seriously rich in coins." },
    ],
  }),
];

// Which achievements get a flashy CSS effect. Deliberately sparse: mostly the
// hardest top-tier tiers plus a few thematically-fitting one-offs, so effects
// stay a rare treat rather than visual noise. Keys must exist in the catalog.
const EFFECT_BY_KEY: Record<string, BadgeEffect> = {
  // Work — sheer effort burns.
  "hard-worker-4": "fire",
  "marathoner-4": "fire",
  "grinder-4": "aurora", // a full year of showing up

  // Earnings — money shines.
  "big-payday-4": "gold",
  "breadwinner-4": "gold",
  "loyal-client-4": "toxic", // a client that just keeps paying — radioactive-good
  "high-roller-4": "rainbow-rain", // literally make it rain

  // Consistency — streaks crackle and freeze.
  "streak-master-4": "electric",
  "legendary-streak-1": "shadow",
  "legendary-streak-2": "glow",
  "consistency-4": "frost",
  "perfect-day": "sparkle",

  // Planner — mastery.
  "planner-pro-4": "neon",

  // Audience — going big / going viral.
  "famous-4": "holo",
  "viral-day-3": "electric",
  "mailing-list-4": "cosmic",
  "engager-4": "neon",

  // Milestones — the sentimental first + the coin whale.
  "first-fan": "heartbeat",
  "first-subscriber": "heartbeat",
  "rich-3": "rainbow",
};

/**
 * Public catalog: the raw defs with cosmetic effects attached. Kept as a
 * separate pass so the (huge) data literal above stays clean and the
 * effect→achievement mapping lives in one readable place.
 */
export const ACHIEVEMENTS: AchievementDef[] = RAW_ACHIEVEMENTS.map((a) => {
  const effect = EFFECT_BY_KEY[a.key];
  return effect ? { ...a, effect } : a;
});

export const CATEGORY_LABELS: Record<Category, string> = {
  // Insertion order implies display order.
  work: "Work",
  earnings: "Earnings",
  consistency: "Consistency",
  planner: "Planner",
  audience: "Audience",
  milestones: "Milestones",
};

export function achievementByKey(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}
