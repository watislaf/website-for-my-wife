"use client";

import { motion } from "motion/react";
import { landing } from "@/content/landing";

export function About() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-2xl shadow-lg shadow-pink-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={landing.portrait}
            alt={landing.name}
            className="h-full w-full object-cover"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
            About
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {landing.about}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
