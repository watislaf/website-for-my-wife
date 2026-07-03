import { describe, it, expect } from "vitest";
import { toEmbedUrl, withTwitchParent } from "./video-embed";

describe("toEmbedUrl", () => {
  it("converts youtube watch URLs", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts youtu.be short URLs", () => {
    expect(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts youtube shorts URLs", () => {
    expect(toEmbedUrl("https://www.youtube.com/shorts/abc123")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
  });

  it("passes through youtube embed URLs", () => {
    expect(toEmbedUrl("https://www.youtube.com/embed/abc123")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
  });

  it("converts vimeo URLs", () => {
    expect(toEmbedUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });

  it("converts tiktok video URLs", () => {
    expect(
      toEmbedUrl("https://www.tiktok.com/@chef/video/7212345678901234567"),
    ).toBe("https://www.tiktok.com/embed/v2/7212345678901234567");
  });

  it("converts twitch video and channel URLs and emits a parent param", () => {
    const video = toEmbedUrl("https://www.twitch.tv/videos/123");
    expect(video).toContain("player.twitch.tv/?video=123");
    // The pure helper must emit a parent param (default placeholder) so the
    // client can rewrite it — locking the earlier regression where the assert
    // stopped before &parent=.
    expect(video).toContain("parent=");

    const channel = toEmbedUrl("https://www.twitch.tv/somechannel");
    expect(channel).toContain("player.twitch.tv/?channel=somechannel");
    expect(channel).toContain("parent=");
  });

  it("rewrites the twitch parent to the real host", () => {
    const embed = toEmbedUrl("https://www.twitch.tv/videos/123")!;
    const rewritten = withTwitchParent(embed, "website-for-my-wife.fly.dev");
    const parent = new URL(rewritten).searchParams.get("parent");
    expect(parent).toBe("website-for-my-wife.fly.dev");
    expect(rewritten).toContain("video=123");
  });

  it("withTwitchParent leaves non-twitch embeds untouched", () => {
    const yt = "https://www.youtube.com/embed/abc123";
    expect(withTwitchParent(yt, "example.com")).toBe(yt);
    // Empty host is a no-op (SSR / unknown host).
    const embed = toEmbedUrl("https://www.twitch.tv/videos/123")!;
    expect(withTwitchParent(embed, "")).toBe(embed);
  });

  it("returns null for unrecognized or invalid URLs", () => {
    expect(toEmbedUrl("https://example.com/whatever")).toBeNull();
    expect(toEmbedUrl("not a url")).toBeNull();
    expect(toEmbedUrl("")).toBeNull();
    expect(toEmbedUrl("javascript:alert(1)")).toBeNull();
  });
});
