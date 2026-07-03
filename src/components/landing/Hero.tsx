"use client";

import { motion } from "motion/react";
import type { LandingContent } from "@/content/landing";
import { Button } from "@/components/ui/button";
import { trackClick } from "./track";

export function Hero({ content }: { content: LandingContent }) {
  return (
    <section className="relative min-h-[90vh] grid place-items-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={content.heroImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 text-center text-white px-6">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-7xl font-bold tracking-tight"
        >
          {content.headline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-lg md:text-xl text-white/85 max-w-xl mx-auto"
        >
          {content.subline}
        </motion.p>
        {content.socials.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex gap-3 justify-center"
          >
            {content.socials.map((s) => (
              <Button
                key={s.name}
                size="lg"
                variant="secondary"
                render={
                  <a href={s.url} onClick={() => trackClick("hero-cta")}>
                    {s.name}
                  </a>
                }
              />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
