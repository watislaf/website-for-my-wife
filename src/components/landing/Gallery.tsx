"use client";

import { motion } from "motion/react";
import type { LandingContent } from "@/content/landing";

export function Gallery({ content }: { content: LandingContent }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="mb-10 text-center text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
        The Kitchen
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {content.gallery.map((src, i) => (
          <motion.div
            key={src}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="overflow-hidden rounded-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover transition-transform hover:scale-105"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
