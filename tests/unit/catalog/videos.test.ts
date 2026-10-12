import { describe, expect, it } from "vitest";

import { MAX_PRODUCT_VIDEOS, normaliseProductVideos, parseYouTubeId, validateSubmittedVideos, youtubePoster } from "@/modules/catalog/videos";

describe("parseYouTubeId", () => {
  it("reads every common link shape", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=10s",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
    ]) {
      expect(parseYouTubeId(url), url).toBe("dQw4w9WgXcQ");
    }
  });

  it("rejects non-YouTube links and malformed ids", () => {
    for (const url of ["https://vimeo.com/123", "https://example.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/short", "not a url", ""]) {
      expect(parseYouTubeId(url), url).toBeNull();
    }
  });

  it("builds the default poster", () => {
    expect(youtubePoster("dQw4w9WgXcQ")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });
});

describe("validateSubmittedVideos", () => {
  const poster = "https://cdn.example.com/p.jpg";

  it("accepts hosted and youtube entries and keeps order", () => {
    const r = validateSubmittedVideos([
      { kind: "hosted", src: "https://cdn.example.com/a.mp4", poster, title: "On the hand" },
      { kind: "youtube", videoId: "dQw4w9WgXcQ", poster, title: "Unboxing" },
      { kind: "hosted", src: "/videos/home/teardrop-earrings.mp4", poster: "/images/categories/earrings.jpg", title: "Film" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.videos.map((v) => v.kind)).toEqual(["hosted", "youtube", "hosted"]);
    expect(r.videos[1]).toMatchObject({ videoId: "dQw4w9WgXcQ", poster: { src: poster, alt: "Unboxing" } });
  });

  it("rejects missing titles, bad posters, bad sources and unknown kinds with a reason", () => {
    expect(validateSubmittedVideos([{ kind: "hosted", src: "https://x/a.mp4", poster, title: " " }])).toMatchObject({ ok: false, error: expect.stringContaining("title") });
    expect(validateSubmittedVideos([{ kind: "hosted", src: "https://x/a.mp4", poster: "ftp://x", title: "t" }])).toMatchObject({ ok: false, error: expect.stringContaining("poster") });
    expect(validateSubmittedVideos([{ kind: "hosted", src: "http://insecure/a.mp4", poster, title: "t" }])).toMatchObject({ ok: false, error: expect.stringContaining("https://") });
    expect(validateSubmittedVideos([{ kind: "youtube", videoId: "nope", poster, title: "t" }])).toMatchObject({ ok: false, error: expect.stringContaining("YouTube") });
    expect(validateSubmittedVideos([{ kind: "vimeo", poster, title: "t" }])).toMatchObject({ ok: false });
    expect(validateSubmittedVideos("x")).toMatchObject({ ok: false });
  });

  it("caps the count", () => {
    const many = Array.from({ length: MAX_PRODUCT_VIDEOS + 1 }, (_, i) => ({ kind: "hosted", src: `https://x/${i}.mp4`, poster, title: `v${i}` }));
    expect(validateSubmittedVideos(many)).toMatchObject({ ok: false, error: expect.stringContaining(String(MAX_PRODUCT_VIDEOS)) });
  });
});

describe("normaliseProductVideos", () => {
  it("drops malformed rows instead of throwing and tolerates non-arrays", () => {
    expect(normaliseProductVideos(null)).toEqual([]);
    expect(normaliseProductVideos("[]")).toEqual([]);
    const out = normaliseProductVideos([
      { kind: "hosted", src: "https://x/a.mp4", poster: { src: "https://x/p.jpg", alt: "" }, title: "A", durationSeconds: 12 },
      { kind: "youtube", videoId: "bad", poster: { src: "https://x/p.jpg" }, title: "B" },
      { kind: "youtube", videoId: "dQw4w9WgXcQ", poster: { src: "https://x/p.jpg" }, title: "C" },
      42,
      { kind: "hosted", src: "javascript:alert(1)", poster: { src: "https://x/p.jpg" }, title: "D" },
    ]);
    expect(out.map((v) => v.title)).toEqual(["A", "C"]);
    expect(out[0]).toMatchObject({ kind: "hosted", durationSeconds: 12, poster: { alt: "A" } });
  });
});
