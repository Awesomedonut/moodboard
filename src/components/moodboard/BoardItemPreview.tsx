"use client";

import { getYouTubeId, getYouTubeThumbnailUrl } from "@/lib/media";
import type { BoardItem } from "@/lib/types";

export function BoardItemThumbnail({ item }: { item: BoardItem }) {
  if (item.type === "youtube") {
    const thumbnailUrl = getYouTubeThumbnailUrl(item.url);

    return (
      <div className="relative aspect-video w-full bg-black">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="YouTube video"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-red-600 px-3 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "link") {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-zinc-100 p-4 dark:bg-zinc-800">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <p className="max-w-full truncate text-center text-sm text-zinc-500 dark:text-zinc-400">
          {item.title}
        </p>
      </div>
    );
  }

  return (
    <img
      src={item.url}
      alt={item.title}
      className="w-full object-cover"
      loading="lazy"
    />
  );
}

export function BoardItemExpanded({ item }: { item: BoardItem }) {
  if (item.type === "youtube") {
    const videoId = getYouTubeId(item.url);

    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="aspect-video w-full max-w-4xl rounded-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (item.type === "link") {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg bg-white p-8 dark:bg-zinc-900">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <p className="text-lg font-medium">{item.title}</p>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Open Link
        </a>
      </div>
    );
  }

  return (
    <img
      src={item.url}
      alt={item.title}
      className="max-h-[85vh] max-w-full rounded-lg object-contain"
    />
  );
}
