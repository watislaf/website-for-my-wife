"use client";

import { motion } from "motion/react";
import type { LandingContent } from "@/content/landing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackClick } from "./track";

export function Socials({ content }: { content: LandingContent }) {
  if (content.socials.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <h2 className="mb-10 text-center text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
        Find Me
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {content.socials.map((s) => (
          <motion.div key={s.name} whileHover={{ y: -6 }}>
            <Card
              className="border-l-4 p-6"
              style={{ borderLeftColor: s.accent }}
            >
              <div className="flex flex-col gap-3">
                <span className="text-xl font-semibold">{s.name}</span>
                <span className="text-muted-foreground">{s.handle}</span>
                <Button
                  variant="secondary"
                  className="mt-2 self-start"
                  render={
                    <a
                      href={s.url}
                      onClick={() => trackClick(s.name.toLowerCase())}
                    >
                      Follow
                    </a>
                  }
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
