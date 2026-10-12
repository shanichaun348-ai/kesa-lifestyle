import type { ProductVideo } from "./types";

export const MAX_PRODUCT_VIDEOS = 3;
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const URL_OR_PATH = /^(https:\/\/|\/)/;

/** Short clips already shipped with the site (the homepage "Kesa in motion" films). */
export const SITE_FILMS: ReadonlyArray<{ src: string; label: string }> = [
  { src: "/videos/home/antique-mangalsutra.mp4", label: "Antique mangalsutra" },
  { src: "/videos/home/crystal-flower-necklace.mp4", label: "Crystal flower necklace" },
  { src: "/videos/home/gem-charm-bracelet.mp4", label: "Gem charm bracelet" },
  { src: "/videos/home/teardrop-earrings.mp4", label: "Teardrop earrings" },
];

/** Extracts the 11-character video id from any youtube.com / youtu.be link (or a bare id). */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (YOUTUBE_ID.test(s)) return s;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = /^\/(?:embed|shorts|v|live)\/([^/?]+)/.exec(url.pathname);
      id = m?.[1] ?? null;
    }
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

export function youtubePoster(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** The shape the admin form submits; `kind` decides which of src / videoId is used. */
export type SubmittedVideo = { kind: "hosted" | "youtube"; src?: string; videoId?: string; poster: string; title: string };

export type VideosValidation = { ok: true; videos: ProductVideo[] } | { ok: false; error: string };

/** Strict validation for admin saves: any problem rejects the whole save with a reason. */
export function validateSubmittedVideos(raw: unknown): VideosValidation {
  if (!Array.isArray(raw)) return { ok: false, error: "Video data was malformed — reload the page and try again." };
  if (raw.length > MAX_PRODUCT_VIDEOS) return { ok: false, error: `Up to ${MAX_PRODUCT_VIDEOS} videos per product.` };
  const videos: ProductVideo[] = [];
  for (const [i, entry] of raw.entries()) {
    const n = i + 1;
    if (typeof entry !== "object" || entry === null) return { ok: false, error: `Video ${n} is malformed.` };
    const v = entry as Record<string, unknown>;
    const title = typeof v.title === "string" ? v.title.trim() : "";
    const poster = typeof v.poster === "string" ? v.poster.trim() : "";
    if (!title) return { ok: false, error: `Video ${n} needs a title.` };
    if (title.length > 120) return { ok: false, error: `Video ${n}: keep the title under 120 characters.` };
    if (!URL_OR_PATH.test(poster)) return { ok: false, error: `Video ${n} needs a poster image — pick one of the product photos or paste an https:// URL.` };
    const posterRef = { src: poster, alt: title };
    if (v.kind === "youtube") {
      const id = typeof v.videoId === "string" ? v.videoId.trim() : "";
      if (!YOUTUBE_ID.test(id)) return { ok: false, error: `Video ${n}: that is not a valid YouTube link.` };
      videos.push({ kind: "youtube", videoId: id, poster: posterRef, title });
    } else if (v.kind === "hosted") {
      const src = typeof v.src === "string" ? v.src.trim() : "";
      if (!URL_OR_PATH.test(src)) return { ok: false, error: `Video ${n}: the video URL must start with https:// (or / for a site file).` };
      videos.push({ kind: "hosted", src, poster: posterRef, title });
    } else {
      return { ok: false, error: `Video ${n} has an unknown type.` };
    }
  }
  return { ok: true, videos };
}

/** Lenient read for the catalogue: malformed entries are dropped, never thrown. */
export function normaliseProductVideos(raw: unknown): ProductVideo[] {
  if (!Array.isArray(raw)) return [];
  const videos: ProductVideo[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const v = entry as Record<string, unknown>;
    const title = typeof v.title === "string" ? v.title : "";
    const poster = v.poster as Record<string, unknown> | undefined;
    const posterSrc = typeof poster?.src === "string" ? poster.src : "";
    if (!title || !URL_OR_PATH.test(posterSrc)) continue;
    const posterRef = { src: posterSrc, alt: typeof poster?.alt === "string" && poster.alt ? poster.alt : title };
    if (v.kind === "youtube" && typeof v.videoId === "string" && YOUTUBE_ID.test(v.videoId)) {
      videos.push({ kind: "youtube", videoId: v.videoId, poster: posterRef, title });
    } else if (v.kind === "hosted" && typeof v.src === "string" && URL_OR_PATH.test(v.src)) {
      videos.push({ kind: "hosted", src: v.src, poster: posterRef, title, ...(typeof v.durationSeconds === "number" ? { durationSeconds: v.durationSeconds } : {}) });
    }
    if (videos.length === MAX_PRODUCT_VIDEOS) break;
  }
  return videos;
}
