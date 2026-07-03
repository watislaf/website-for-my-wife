"use client";

import { motion } from "motion/react";
import type { RecipesSection as RecipesSectionType } from "@/content/landing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RecipesSection({
  data,
}: {
  data: RecipesSectionType["data"];
}) {
  const items = (data.items ?? []).filter((r) => r.title?.trim());
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="mb-10 text-center text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
        Recipes
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="flex h-full flex-col overflow-hidden p-0">
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.image}
                  alt={r.title}
                  className="h-48 w-full object-cover"
                />
              ) : null}
              <div className="flex flex-1 flex-col gap-3 p-6">
                <h3 className="text-xl font-semibold text-pink-600">
                  {r.title}
                </h3>
                {r.text ? (
                  <p className="text-muted-foreground">{r.text}</p>
                ) : null}
                {r.link?.trim() ? (
                  <Button
                    variant="secondary"
                    className="mt-auto self-start"
                    render={
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        See recipe
                      </a>
                    }
                  />
                ) : null}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
