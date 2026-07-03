// ── Toggleable / reorderable sections ───────────────────────────────────────
// These render BELOW the always-on core (hero/about/gallery/socials). Each has a
// stable `id` == `type` (one instance per type), an `enabled` flag, an `order`
// used to sort the enabled ones on the public page, and a typed `data` payload.
// Adding a new type later (e.g. "newsletter") = add a variant here, a default
// entry below, a public component, and a manager editor. Nothing else changes.

export type VideoSection = {
  id: "video";
  type: "video";
  enabled: boolean;
  order: number;
  data: { title: string; url: string };
};

export type TestimonialItem = { quote: string; author: string; role?: string };
export type TestimonialsSection = {
  id: "testimonials";
  type: "testimonials";
  enabled: boolean;
  order: number;
  data: { items: TestimonialItem[] };
};

export type RecipeItem = {
  title: string;
  image: string;
  text: string;
  link?: string;
};
export type RecipesSection = {
  id: "recipes";
  type: "recipes";
  enabled: boolean;
  order: number;
  data: { items: RecipeItem[] };
};

export type Section = VideoSection | TestimonialsSection | RecipesSection;

/** Every section type we know about — the manager always shows all of these. */
export const SECTION_TYPES = ["video", "testimonials", "recipes"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

// Default sections: all present but DISABLED so the live page is unchanged until
// the user turns them on. Order 0,1,2 (video first once enabled).
export const defaultSections: Section[] = [
  {
    id: "video",
    type: "video",
    enabled: false,
    order: 0,
    data: {
      title: "Watch the latest",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
  },
  {
    id: "testimonials",
    type: "testimonials",
    enabled: false,
    order: 1,
    data: {
      items: [
        {
          quote: "Made this on a Tuesday and my whole family went quiet. Rare.",
          author: "A very happy eater",
          role: "Regular viewer",
        },
      ],
    },
  },
  {
    id: "recipes",
    type: "recipes",
    enabled: false,
    order: 2,
    data: {
      items: [
        {
          title: "Weeknight noodles",
          image: "/landing/dish1.svg",
          text: "Big restaurant flavor, fifteen minutes, one pan.",
          link: "",
        },
      ],
    },
  },
];

export const landing = {
  name: "Your Name", // ← she edits this
  headline: "I cook. You watch. Everybody eats.",
  subline:
    "Home cooking, loud flavors, zero gatekeeping. New videos every week.",
  about:
    "Cook and creator. I break down big restaurant flavors into food you can actually make on a Tuesday night.",
  heroImage: "/landing/hero.svg",
  portrait: "/landing/portrait.svg",
  gallery: [
    "/landing/dish1.svg",
    "/landing/dish2.svg",
    "/landing/dish3.svg",
    "/landing/dish4.svg",
  ],
  socials: [
    { name: "TikTok", handle: "@paste-later", url: "#", accent: "#00f2ea" },
    { name: "Instagram", handle: "@paste-later", url: "#", accent: "#e1306c" },
    { name: "Twitch", handle: "paste-later", url: "#", accent: "#9146ff" },
  ],
  sections: defaultSections,
};

// Client-safe content type derived from the defaults above. Both server and
// client components import this type (no server-only code here).
export type LandingContent = typeof landing & { sections: Section[] };
