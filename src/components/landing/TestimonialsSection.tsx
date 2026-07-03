"use client";

import { motion } from "motion/react";
import type { TestimonialsSection as TestimonialsSectionType } from "@/content/landing";
import { Card } from "@/components/ui/card";

export function TestimonialsSection({
  data,
}: {
  data?: TestimonialsSectionType["data"];
}) {
  const items = (Array.isArray(data?.items) ? data.items : []).filter(
    (t) => t && typeof t.quote === "string" && t.quote.trim(),
  );
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <h2 className="mb-10 text-center text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
        Kind Words
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="h-full border-l-4 border-l-pink-400 p-6">
              <blockquote className="flex h-full flex-col gap-4">
                <p className="text-lg leading-relaxed">“{t.quote}”</p>
                <footer className="mt-auto">
                  <span className="font-semibold text-pink-600">
                    {t.author}
                  </span>
                  {t.role ? (
                    <span className="text-muted-foreground"> · {t.role}</span>
                  ) : null}
                </footer>
              </blockquote>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
