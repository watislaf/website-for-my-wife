"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";

import {
  saveLandingText,
  saveLandingSocials,
  setLandingImage,
  setGalleryImage,
  uploadLandingImage,
} from "@/actions/landing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SectionsManager } from "./SectionsManager";
import type { Section } from "@/content/landing";

// Local mirror of the content shape (the real type lives in a server-only
// module; we duplicate the plain shape here so nothing server-only is imported
// into this client component). `Section` comes from the client-safe content
// module, so importing its type here is fine.
type Social = { name: string; handle: string; url: string; accent: string };
export type LandingContentProps = {
  name: string;
  headline: string;
  subline: string;
  about: string;
  heroImage: string;
  portrait: string;
  gallery: string[];
  socials: Social[];
  sections: Section[];
};

export function LandingEditor({ content }: { content: LandingContentProps }) {
  return (
    <div className="flex flex-col gap-8">
      <TextForm content={content} />
      <SocialsForm socials={content.socials} />
      <ImagesForm content={content} />
      <SectionsManager sections={content.sections} />
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-lg font-semibold text-pink-600">{title}</h2>
      {children}
    </Card>
  );
}

function TextForm({ content }: { content: LandingContentProps }) {
  const [name, setName] = useState(content.name);
  const [headline, setHeadline] = useState(content.headline);
  const [subline, setSubline] = useState(content.subline);
  const [about, setAbout] = useState(content.about);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) return toast.error("Name is required");
    if (!headline.trim()) return toast.error("Headline is required");
    startTransition(async () => {
      try {
        await saveLandingText({ name, headline, subline, about });
        toast.success("Text saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  return (
    <SectionCard title="Text">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subline">Subline</Label>
          <Input
            id="subline"
            value={subline}
            onChange={(e) => setSubline(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="about">About</Label>
          <Textarea
            id="about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
          />
        </div>
        <Button className="self-start" onClick={handleSave} disabled={pending}>
          Save text
        </Button>
      </div>
    </SectionCard>
  );
}

const EMPTY_SOCIAL: Social = {
  name: "",
  handle: "",
  url: "#",
  accent: "#ec4899",
};

function isBlankSocial(s: Social): boolean {
  return !s.name.trim() && !s.handle.trim() && (!s.url.trim() || s.url.trim() === "#");
}

function SocialsForm({ socials: initial }: { socials: Social[] }) {
  const [socials, setSocials] = useState<Social[]>(initial);
  const [pending, startTransition] = useTransition();

  function update(i: number, patch: Partial<Social>) {
    setSocials((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );
  }

  function addSocial() {
    setSocials((prev) => [...prev, { ...EMPTY_SOCIAL }]);
  }

  function removeSocial(i: number) {
    setSocials((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    // Drop fully-empty rows and trim strings so blanks aren't persisted.
    const cleaned = socials
      .filter((s) => !isBlankSocial(s))
      .map((s) => ({
        name: s.name.trim(),
        handle: s.handle.trim(),
        url: s.url.trim() || "#",
        accent: s.accent.trim() || "#ec4899",
      }));

    startTransition(async () => {
      try {
        await saveLandingSocials(cleaned);
        setSocials(cleaned);
        toast.success("Socials saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  return (
    <SectionCard title="Social links">
      <div className="flex flex-col gap-4">
        {socials.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No social links yet. Add one below.
          </p>
        )}
        {socials.map((s, i) => (
          <div
            key={i}
            className="grid gap-2 sm:grid-cols-[1fr_1fr_1.5fr_auto_auto] sm:items-center"
          >
            <Input
              aria-label="Name"
              placeholder="Name"
              value={s.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <Input
              aria-label="Handle"
              placeholder="Handle"
              value={s.handle}
              onChange={(e) => update(i, { handle: e.target.value })}
            />
            <Input
              aria-label="URL"
              placeholder="https://…"
              value={s.url}
              onChange={(e) => update(i, { url: e.target.value })}
            />
            <input
              aria-label="Accent color"
              type="color"
              value={s.accent}
              onChange={(e) => update(i, { accent: e.target.value })}
              className="h-8 w-12 cursor-pointer rounded-lg border border-input bg-transparent"
            />
            <Button
              variant="destructive"
              size="icon"
              aria-label="Remove social"
              title="Remove social"
              onClick={() => removeSocial(i)}
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="self-start" onClick={addSocial}>
            <PlusIcon />
            Add social
          </Button>
          <Button className="self-start" onClick={handleSave} disabled={pending}>
            Save socials
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function ImagesForm({ content }: { content: LandingContentProps }) {
  const [heroImage, setHeroImage] = useState(content.heroImage);
  const [portrait, setPortrait] = useState(content.portrait);
  const [gallery, setGallery] = useState<string[]>(content.gallery);

  return (
    <SectionCard title="Images">
      <div className="flex flex-col gap-6">
        <ImageSlot
          label="Hero image"
          src={heroImage}
          onUploaded={async (url) => {
            await setLandingImage("heroImage", url);
            setHeroImage(url);
          }}
        />
        <ImageSlot
          label="Portrait"
          src={portrait}
          onUploaded={async (url) => {
            await setLandingImage("portrait", url);
            setPortrait(url);
          }}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          {gallery.map((src, i) => (
            <ImageSlot
              key={i}
              label={`Gallery ${i + 1}`}
              src={src}
              onUploaded={async (url) => {
                await setGalleryImage(i, url);
                setGallery((prev) =>
                  prev.map((g, idx) => (idx === i ? url : g)),
                );
              }}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ImageSlot({
  label,
  src,
  onUploaded,
}: {
  label: string;
  src: string;
  onUploaded: (url: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  function handleUpload() {
    if (!file) return toast.error("Choose a file first");
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { url } = await uploadLandingImage(fd);
        await onUploaded(url);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        toast.success(`${label} updated`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label>{label}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-muted-foreground file:mr-2 file:rounded-lg file:border file:border-input file:bg-background file:px-2.5 file:py-1 file:text-sm file:font-medium"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUpload}
            disabled={pending || !file}
          >
            <UploadIcon />
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
