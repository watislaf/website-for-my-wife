import { Hero } from "@/components/landing/Hero";
import { About } from "@/components/landing/About";
import { Gallery } from "@/components/landing/Gallery";
import { Socials } from "@/components/landing/Socials";
import { PageviewBeacon } from "@/components/landing/PageviewBeacon";
import { getLandingContent } from "@/lib/site-content";

// Reads live CMS content from the DB — must not be statically prerendered, or
// edits would freeze at build time and revert on every redeploy.
export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getLandingContent();

  return (
    <>
      <PageviewBeacon />
      <main className="flex-1">
        <Hero content={content} />
        <About content={content} />
        <Gallery content={content} />
        <Socials content={content} />
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
