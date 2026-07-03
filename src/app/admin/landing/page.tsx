import { getLandingContent } from "@/lib/site-content";
import { LandingEditor } from "@/components/landing-admin/LandingEditor";

export default async function LandingAdminPage() {
  const content = await getLandingContent();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold heading-gradient">Landing</h1>
      <LandingEditor content={content} />
    </div>
  );
}
