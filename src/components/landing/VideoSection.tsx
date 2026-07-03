"use client";

import { motion } from "motion/react";
import type { VideoSection as VideoSectionType } from "@/content/landing";
import { toEmbedUrl } from "@/lib/video-embed";

export function VideoSection({ data }: { data: VideoSectionType["data"] }) {
  const url = data.url?.trim();
  if (!url) return null;

  const embed = toEmbedUrl(url);

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-10 text-center text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent"
      >
        {data.title || "Watch"}
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {embed ? (
          <div className="relative w-full overflow-hidden rounded-2xl shadow-lg shadow-pink-200 aspect-video">
            <iframe
              src={embed}
              title={data.title || "Video"}
              className="absolute inset-0 h-full w-full"
              // Untrusted third-party embed: sandbox to the minimum a player
              // needs. No allow-top-navigation / allow-popups-to-escape-sandbox.
              sandbox="allow-scripts allow-same-origin allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <p className="text-center">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 underline underline-offset-4 hover:text-pink-500"
            >
              Watch the video →
            </a>
          </p>
        )}
      </motion.div>
    </section>
  );
}
