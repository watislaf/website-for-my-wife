import { describe, it, expect } from "vitest";
import { resolveSource } from "./traffic";

describe("resolveSource", () => {
  it("uses utmSource when present, normalized (trim + lowercase)", () => {
    expect(resolveSource("TikTok", null)).toBe("tiktok");
    expect(resolveSource("  Instagram  ", null)).toBe("instagram");
  });

  it("prefers a non-empty utmSource over the referer", () => {
    expect(resolveSource("newsletter", "https://instagram.com/foo")).toBe("newsletter");
  });

  it("ignores empty / whitespace-only utmSource and falls back to referer", () => {
    expect(resolveSource("", "https://instagram.com/foo")).toBe("instagram");
    expect(resolveSource("   ", "https://instagram.com/foo")).toBe("instagram");
  });

  it("maps each known referer host to its source", () => {
    expect(resolveSource(null, "https://instagram.com/x")).toBe("instagram");
    expect(resolveSource(null, "https://l.instagram.com/x")).toBe("instagram");
    expect(resolveSource(null, "https://tiktok.com/@x")).toBe("tiktok");
    expect(resolveSource(null, "https://vm.tiktok.com/abc")).toBe("tiktok");
    expect(resolveSource(null, "https://t.co/abc")).toBe("tiktok");
    expect(resolveSource(null, "https://twitch.tv/x")).toBe("twitch");
    expect(resolveSource(null, "https://youtube.com/x")).toBe("youtube");
    expect(resolveSource(null, "https://youtu.be/x")).toBe("youtube");
    expect(resolveSource(null, "https://facebook.com/x")).toBe("facebook");
    expect(resolveSource(null, "https://m.facebook.com/x")).toBe("facebook");
    expect(resolveSource(null, "https://linkedin.com/x")).toBe("linkedin");
    expect(resolveSource(null, "https://lnkd.in/x")).toBe("linkedin");
    expect(resolveSource(null, "https://pinterest.com/x")).toBe("pinterest");
    expect(resolveSource(null, "https://pin.it/x")).toBe("pinterest");
    expect(resolveSource(null, "https://reddit.com/r/x")).toBe("reddit");
  });

  it("maps search engines to 'search'", () => {
    expect(resolveSource(null, "https://www.google.com/")).toBe("search");
    expect(resolveSource(null, "https://google.com/search?q=x")).toBe("search");
    expect(resolveSource(null, "https://google.co.uk/")).toBe("search");
    expect(resolveSource(null, "https://www.bing.com/")).toBe("search");
    expect(resolveSource(null, "https://duckduckgo.com/")).toBe("search");
  });

  it("matches known hosts case-insensitively", () => {
    expect(resolveSource(null, "https://Instagram.com/x")).toBe("instagram");
  });

  it("returns the bare domain (www. stripped) for unknown hosts", () => {
    expect(resolveSource(null, "https://www.example.com/path?q=1")).toBe("example.com");
    expect(resolveSource(null, "https://blog.example.org/")).toBe("blog.example.org");
  });

  it("returns 'direct' when both are null/empty", () => {
    expect(resolveSource(null, null)).toBe("direct");
    expect(resolveSource("", "")).toBe("direct");
    expect(resolveSource(null, "   ")).toBe("direct");
  });

  it("returns 'direct' for a malformed / unparseable referer", () => {
    expect(resolveSource(null, "not a url")).toBe("direct");
    expect(resolveSource(null, "://///")).toBe("direct");
  });
});
