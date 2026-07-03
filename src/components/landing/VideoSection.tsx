"use client";

import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import type { VideoSection as VideoSectionType } from "@/content/landing";
import { toEmbedUrl, withTwitchParent } from "@/lib/video-embed";

// SSR-safe host read: the server snapshot is "" (use the placeholder parent),
// the client snapshot is the real hostname. useSyncExternalStore handles the
// hydration handoff without a setState-in-effect.
const emptySubscribe = () => () => {};
function useHost(): string {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.location.hostname,
    () => "",
  );
}

export function VideoSection({ data }: { data?: VideoSectionType["data"] }) {
  const url = typeof data?.url === "string" ? data.url.trim() : "";
  const title = typeof data?.title === "string" ? data.title : "";

  // Rewrite the Twitch `parent` param to the real host so the player loads in
  // production (Twitch rejects an embed whose `parent` doesn't match the page
  // host). Non-Twitch embeds are unaffected.
  const host = useHost();
  const baseEmbed = url ? toEmbedUrl(url) : null;
  const embed = baseEmbed ? withTwitchParent(baseEmbed, host) : null;

  if (!url) return null;

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-10 text-center text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent"
      >
        {title || "Watch"}
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
              title={title || "Video"}
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
