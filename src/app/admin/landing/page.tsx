import { desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { getLandingContent } from "@/lib/site-content";
import { LandingEditor } from "@/components/landing-admin/LandingEditor";
import { Reveal } from "@/components/motion/Reveal";

export default async function LandingAdminPage() {
  const content = await getLandingContent();

  // Total count + most-recent 50 emails (newest first) for the newsletter panel.
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscribers);
  const recent = await db
    .select({ email: subscribers.email, createdAt: subscribers.createdAt })
    .from(subscribers)
    .orderBy(desc(subscribers.id))
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <Reveal onMount>
        <h1 className="text-2xl font-semibold heading-gradient">Landing</h1>
      </Reveal>
      <Reveal>
        <LandingEditor
          content={content}
          subscriberCount={countRow?.count ?? 0}
          recentSubscribers={recent}
        />
      </Reveal>
    </div>
  );
}
