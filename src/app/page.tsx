import { Hero } from "@/components/landing/Hero";
import { About } from "@/components/landing/About";
import { Gallery } from "@/components/landing/Gallery";
import { Socials } from "@/components/landing/Socials";
import { PageviewBeacon } from "@/components/landing/PageviewBeacon";

export default function Home() {
  return (
    <>
      <PageviewBeacon />
      <main className="flex-1">
        <Hero />
        <About />
        <Gallery />
        <Socials />
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
