"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import { saveSections, uploadLandingImage } from "@/actions/landing";
import type { Section } from "@/content/landing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const TITLES: Record<Section["type"], string> = {
  video: "Video",
  testimonials: "Testimonials",
  recipes: "Recipes",
};

export function SectionsManager({ sections: initial }: { sections: Section[] }) {
  // Keep local sections sorted by order so up/down maps to array position.
  const [sections, setSections] = useState<Section[]>(() =>
    [...initial].sort((a, b) => a.order - b.order),
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /** Save the given list, re-normalizing order to array position. */
  function persist(list: Section[], successMsg: string) {
    const withOrder = list.map((s, i) => ({ ...s, order: i }) as Section);
    startTransition(async () => {
      try {
        await saveSections(withOrder);
        setSections(withOrder);
        toast.success(successMsg);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  function toggle(id: string, enabled: boolean) {
    persist(
      sections.map((s) => (s.id === id ? ({ ...s, enabled } as Section) : s)),
      enabled ? "Section enabled" : "Section disabled",
    );
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next, "Order updated");
  }

  // Update one section's data locally (no save until "Save content" is clicked).
  function updateData(id: string, data: Section["data"]) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? ({ ...s, data } as Section) : s)),
    );
  }

  function saveContent(id: string) {
    const s = sections.find((x) => x.id === id);
    if (s) persist(sections, `${TITLES[s.type]} content saved`);
  }

  return (
    <Card className="p-6">
      <h2 className="mb-1 text-lg font-semibold text-pink-600">Sections</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Extra sections shown below the main page, in this order. Toggle to show or
        hide each on the live site.
      </p>
      <div className="flex flex-col gap-3">
        {sections.map((s, i) => (
          <div key={s.id} className="rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move up"
                  title="Move up"
                  disabled={i === 0 || pending}
                  onClick={() => move(i, -1)}
                >
                  <ChevronUpIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  title="Move down"
                  disabled={i === sections.length - 1 || pending}
                  onClick={() => move(i, 1)}
                >
                  <ChevronDownIcon />
                </Button>
              </div>
              <span className="font-medium">{TITLES[s.type]}</span>
              <div className="ml-auto flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={(checked) => toggle(s.id, checked)}
                    disabled={pending}
                    aria-label={`Enable ${TITLES[s.type]}`}
                  />
                  {s.enabled ? "On" : "Off"}
                </label>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setExpanded((cur) => (cur === s.id ? null : s.id))
                  }
                >
                  {expanded === s.id ? "Close" : "Edit"}
                </Button>
              </div>
            </div>

            {expanded === s.id && (
              <div className="border-t border-border p-4">
                <SectionEditor
                  section={s}
                  onChange={(data) => updateData(s.id, data)}
                />
                <Button
                  className="mt-4"
                  onClick={() => saveContent(s.id)}
                  disabled={pending}
                >
                  Save content
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function SectionEditor({
  section,
  onChange,
}: {
  section: Section;
  onChange: (data: Section["data"]) => void;
}) {
  switch (section.type) {
    case "video":
      return <VideoEditor data={section.data} onChange={onChange} />;
    case "testimonials":
      return <TestimonialsEditor data={section.data} onChange={onChange} />;
    case "recipes":
      return <RecipesEditor data={section.data} onChange={onChange} />;
    default:
      return null;
  }
}

type VideoData = Extract<Section, { type: "video" }>["data"];
function VideoEditor({
  data,
  onChange,
}: {
  data: VideoData;
  onChange: (d: VideoData) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="video-title">Title</Label>
        <Input
          id="video-title"
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="video-url">Video URL</Label>
        <Input
          id="video-url"
          placeholder="https://www.youtube.com/watch?v=…"
          value={data.url}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          YouTube, Vimeo, Twitch or TikTok. Unrecognized links show as a plain
          link.
        </p>
      </div>
    </div>
  );
}

type TestimonialsData = Extract<Section, { type: "testimonials" }>["data"];
function TestimonialsEditor({
  data,
  onChange,
}: {
  data: TestimonialsData;
  onChange: (d: TestimonialsData) => void;
}) {
  const items = data.items;
  function update(i: number, patch: Partial<TestimonialsData["items"][number]>) {
    onChange({
      items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    });
  }
  function add() {
    onChange({ items: [...items, { quote: "", author: "", role: "" }] });
  }
  function remove(i: number) {
    onChange({ items: items.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No testimonials yet.</p>
      )}
      {items.map((t, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1.5">
            <Label>Quote</Label>
            <Textarea
              value={t.quote}
              onChange={(e) => update(i, { quote: e.target.value })}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Author</Label>
              <Input
                value={t.author}
                onChange={(e) => update(i, { author: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Role (optional)</Label>
              <Input
                value={t.role ?? ""}
                onChange={(e) => update(i, { role: e.target.value })}
              />
            </div>
            <Button
              variant="destructive"
              size="icon"
              aria-label="Remove testimonial"
              onClick={() => remove(i)}
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" className="self-start" onClick={add}>
        <PlusIcon />
        Add testimonial
      </Button>
    </div>
  );
}

type RecipesData = Extract<Section, { type: "recipes" }>["data"];
function RecipesEditor({
  data,
  onChange,
}: {
  data: RecipesData;
  onChange: (d: RecipesData) => void;
}) {
  const items = data.items;
  function update(i: number, patch: Partial<RecipesData["items"][number]>) {
    onChange({
      items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    });
  }
  function add() {
    onChange({
      items: [...items, { title: "", image: "", text: "", link: "" }],
    });
  }
  function remove(i: number) {
    onChange({ items: items.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No recipes yet.</p>
      )}
      {items.map((r, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input
              value={r.title}
              onChange={(e) => update(i, { title: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Text</Label>
            <Textarea
              value={r.text}
              onChange={(e) => update(i, { text: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Link (optional)</Label>
            <Input
              placeholder="https://…"
              value={r.link ?? ""}
              onChange={(e) => update(i, { link: e.target.value })}
            />
          </div>
          <RecipeImage
            src={r.image}
            onUploaded={(url) => update(i, { image: url })}
          />
          <Button
            variant="destructive"
            size="icon"
            aria-label="Remove recipe"
            className="self-start"
            onClick={() => remove(i)}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <Button variant="secondary" className="self-start" onClick={add}>
        <PlusIcon />
        Add recipe
      </Button>
    </div>
  );
}

function RecipeImage({
  src,
  onUploaded,
}: {
  src: string;
  onUploaded: (url: string) => void;
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
        onUploaded(url);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        toast.success("Image uploaded — remember to Save content");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
          No image
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label>Image</Label>
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
