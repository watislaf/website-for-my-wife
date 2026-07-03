"use server";

import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  getLandingContent,
  saveLandingContent,
  type LandingContent,
} from "@/lib/site-content";
import { defaultSections, type Section } from "@/content/landing";

function revalidate() {
  revalidatePath("/");
  revalidatePath("/admin/landing");
}

// Uploaded images live next to the DB on the volume so they persist on Fly and
// are covered by volume snapshots — NOT in the repo/public dir.
const UPLOAD_DIR = path.join(
  path.dirname(process.env.DATABASE_PATH ?? "./data/app.db"),
  "uploads",
);

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

// SVG deliberately excluded — an uploaded .svg served same-origin is executable
// script (stored XSS). Only raster formats are accepted.
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

type GalleryField = "heroImage" | "portrait";

export async function saveLandingText(data: {
  name: string;
  headline: string;
  subline: string;
  about: string;
}): Promise<void> {
  const name = data.name.trim();
  const headline = data.headline.trim();
  if (!name) throw new Error("Name required");
  if (!headline) throw new Error("Headline required");

  const current = await getLandingContent();
  const next: LandingContent = {
    ...current,
    name,
    headline,
    subline: data.subline.trim(),
    about: data.about.trim(),
  };
  await saveLandingContent(next);
  revalidate();
}

export async function saveLandingSocials(
  socials: LandingContent["socials"],
): Promise<void> {
  const cleaned = socials.map((s) => ({
    name: s.name.trim(),
    handle: s.handle.trim(),
    url: s.url.trim() || "#",
    accent: s.accent.trim() || "#ec4899",
  }));

  const current = await getLandingContent();
  await saveLandingContent({ ...current, socials: cleaned });
  revalidate();
}

export async function setLandingImage(
  field: GalleryField,
  url: string,
): Promise<void> {
  const current = await getLandingContent();
  await saveLandingContent({ ...current, [field]: url });
  revalidate();
}

export async function setGalleryImage(
  index: number,
  url: string,
): Promise<void> {
  const current = await getLandingContent();
  if (index < 0 || index >= current.gallery.length) {
    throw new Error("Invalid gallery slot");
  }
  const gallery = [...current.gallery];
  gallery[index] = url;
  await saveLandingContent({ ...current, gallery });
  revalidate();
}

/**
 * Persist the toggleable sections. Validates/normalizes each incoming section
 * against the known types (dropping unknown ones and coercing to the right
 * shape), backfills any missing type from defaults, then saves. Order is taken
 * as-given (the manager sets it via reorder), so the public page can sort by it.
 */
export async function saveSections(sections: Section[]): Promise<void> {
  const byType = new Map<string, Section>();
  for (const s of Array.isArray(sections) ? sections : []) {
    const norm = normalizeSection(s);
    if (norm) byType.set(norm.type, norm);
  }

  // Ensure every known type exists (fall back to default if the client omitted
  // one) so stored content always round-trips a full set.
  const next = defaultSections.map((def) => byType.get(def.type) ?? def);

  const current = await getLandingContent();
  await saveLandingContent({ ...current, sections: next });
  revalidate();
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Coerce an untrusted section into a valid typed Section, or null if unknown. */
function normalizeSection(input: unknown): Section | null {
  if (!input || typeof input !== "object") return null;
  const s = input as Record<string, unknown>;
  const enabled = s.enabled === true;
  const order =
    typeof s.order === "number" && Number.isFinite(s.order) ? s.order : 0;
  const data = (s.data ?? {}) as Record<string, unknown>;

  switch (s.type) {
    case "video":
      return {
        id: "video",
        type: "video",
        enabled,
        order,
        data: { title: str(data.title).trim(), url: str(data.url).trim() },
      };
    case "testimonials": {
      const items = Array.isArray(data.items) ? data.items : [];
      return {
        id: "testimonials",
        type: "testimonials",
        enabled,
        order,
        data: {
          items: items.map((it) => {
            const t = (it ?? {}) as Record<string, unknown>;
            const role = str(t.role).trim();
            return {
              quote: str(t.quote).trim(),
              author: str(t.author).trim(),
              ...(role ? { role } : {}),
            };
          }),
        },
      };
    }
    case "recipes": {
      const items = Array.isArray(data.items) ? data.items : [];
      return {
        id: "recipes",
        type: "recipes",
        enabled,
        order,
        data: {
          items: items.map((it) => {
            const r = (it ?? {}) as Record<string, unknown>;
            const link = str(r.link).trim();
            return {
              title: str(r.title).trim(),
              image: str(r.image).trim(),
              text: str(r.text).trim(),
              ...(link ? { link } : {}),
            };
          }),
        },
      };
    }
    default:
      return null;
  }
}

/**
 * Upload an image to the volume and return its public URL (/api/media/<name>).
 * Admin-only in practice: this action is only invoked from /admin/landing, which
 * the proxy guards. Validates content-type is an image and size ≤ 5MB.
 */
export async function uploadLandingImage(
  formData: FormData,
): Promise<{ url: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");

  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) throw new Error("Unsupported image type");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image too large (max 5MB)");

  const bytes = Buffer.from(await file.arrayBuffer());

  // Build a safe, unique filename: sanitized base + random suffix + ext. The
  // final name only ever contains [A-Za-z0-9._-] so it round-trips through the
  // media route's charset guard.
  const rawBase = path.basename(file.name, path.extname(file.name));
  const safeBase =
    rawBase.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || "image";
  const suffix = randomBytes(6).toString("hex");
  const filename = `${safeBase}-${suffix}${ext}`;

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), bytes);

  return { url: `/api/media/${filename}` };
}
