import { Hero } from "@/components/landing/Hero";
import { About } from "@/components/landing/About";
import { Gallery } from "@/components/landing/Gallery";
import { Socials } from "@/components/landing/Socials";
import { VideoSection } from "@/components/landing/VideoSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { RecipesSection } from "@/components/landing/RecipesSection";
import { NewsletterSection } from "@/components/landing/NewsletterSection";
import { PageviewBeacon } from "@/components/landing/PageviewBeacon";
import { getLandingContent } from "@/lib/site-content";
import type { Section } from "@/content/landing";

function renderSection(section: Section) {
  switch (section.type) {
    case "video":
      return <VideoSection key={section.id} data={section.data} />;
    case "testimonials":
      return <TestimonialsSection key={section.id} data={section.data} />;
    case "recipes":
      return <RecipesSection key={section.id} data={section.data} />;
    case "newsletter":
      return <NewsletterSection key={section.id} data={section.data} />;
    default:
      return null;
  }
}

// Reads live CMS content from the DB — must not be statically prerendered, or
// edits would freeze at build time and revert on every redeploy.
export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getLandingContent();

  const extraSections = content.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      <PageviewBeacon />
      <main className="flex-1">
        <Hero content={content} />
        <About content={content} />
        <Gallery content={content} />
        <Socials content={content} />
        {extraSections.map(renderSection)}
      </main>
      <footer className="py-10 text-center">
        <a
          href="/login"
          aria-label="admin"
          className="text-2xl opacity-40 transition-opacity hover:opacity-100"
        >
          👩‍🍳
        </a>
      </footer>
    </>
  );
}
