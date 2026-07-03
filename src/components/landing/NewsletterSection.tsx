"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";

import type { NewsletterSection as NewsletterSectionType } from "@/content/landing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterSection({
  data,
}: {
  data?: NewsletterSectionType["data"];
}) {
  const heading =
    typeof data?.heading === "string" ? data.heading.trim() : "";
  const text = typeof data?.text === "string" ? data.text.trim() : "";
  const buttonLabel =
    (typeof data?.buttonLabel === "string" && data.buttonLabel.trim()) ||
    "Subscribe";

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Data-guarded like the other sections: no heading → nothing to show.
  if (!heading) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (res.ok && payload?.ok) {
        setDone(true);
        setEmail("");
        toast.success("Thanks — you're subscribed!");
      } else {
        toast.error(payload?.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      // Network error etc. — never leave the form stuck.
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="rounded-2xl border border-pink-200 bg-pink-50/60 p-8 text-center shadow-lg shadow-pink-100 dark:border-pink-900/40 dark:bg-pink-950/20"
      >
        <h2 className="mb-3 text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
          {heading}
        </h2>
        {text ? (
          <p className="mb-6 text-muted-foreground">{text}</p>
        ) : (
          <div className="mb-6" />
        )}

        {done ? (
          <p className="text-lg font-medium text-pink-600">
            Thanks — you&apos;re subscribed!
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="flex-1"
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? "Subscribing…" : buttonLabel}
            </Button>
          </form>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          We&apos;ll only email you updates — no spam, unsubscribe anytime.
        </p>
      </motion.div>
    </section>
  );
}
