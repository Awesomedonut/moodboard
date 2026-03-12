import type { BoardItemType } from "@/lib/types";

const YOUTUBE_URL_PATTERN =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/;

export function getYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_URL_PATTERN);
  return match ? match[1] : null;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function detectItemType(url: string): BoardItemType | null {
  const trimmedUrl = url.trim();
  if (!trimmedUrl || !isHttpUrl(trimmedUrl)) {
    return null;
  }

  return getYouTubeId(trimmedUrl) ? "youtube" : "link";
}

export function getDetectedTypeLabel(url: string): string | null {
  const itemType = detectItemType(url);
  if (itemType === "youtube") {
    return "YouTube video";
  }

  if (itemType === "link") {
    return "Link";
  }

  return null;
}

export function getYouTubeThumbnailUrl(url: string): string | null {
  const videoId = getYouTubeId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}
