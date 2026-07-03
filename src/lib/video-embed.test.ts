import { describe, it, expect } from "vitest";
import { toEmbedUrl } from "./video-embed";

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

  it("converts twitch video and channel URLs", () => {
    expect(toEmbedUrl("https://www.twitch.tv/videos/123")).toContain(
      "player.twitch.tv/?video=123",
    );
    expect(toEmbedUrl("https://www.twitch.tv/somechannel")).toContain(
      "player.twitch.tv/?channel=somechannel",
    );
  });

  it("returns null for unrecognized or invalid URLs", () => {
    expect(toEmbedUrl("https://example.com/whatever")).toBeNull();
    expect(toEmbedUrl("not a url")).toBeNull();
    expect(toEmbedUrl("")).toBeNull();
    expect(toEmbedUrl("javascript:alert(1)")).toBeNull();
  });
});
