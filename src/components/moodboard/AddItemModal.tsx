"use client";

import { getDetectedTypeLabel, getYouTubeThumbnailUrl } from "@/lib/media";

interface AddItemModalProps {
  addCaption: string;
  addTitle: string;
  addUrl: string;
  isOpen: boolean;
  onAddUrl: (event: React.FormEvent) => void;
  onCaptionChange: (value: string) => void;
  onClose: () => void;
  onOpenFilePicker: () => void;
  onTitleChange: (value: string) => void;
  onUrlChange: (value: string) => void;
}

export function AddItemModal({
  addCaption,
  addTitle,
  addUrl,
  isOpen,
  onAddUrl,
  onCaptionChange,
  onClose,
  onOpenFilePicker,
  onTitleChange,
  onUrlChange,
}: AddItemModalProps) {
  if (!isOpen) {
    return null;
  }

  const detectedType = getDetectedTypeLabel(addUrl);
  const thumbnailUrl = getYouTubeThumbnailUrl(addUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">Add to Board</h2>

        <button
          onClick={onOpenFilePicker}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          Choose images or drag them onto the board
        </button>

        <div className="mb-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
          <span className="text-xs text-zinc-400">or paste a URL</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        </div>

        <form onSubmit={onAddUrl}>
          <input
            type="text"
            value={addUrl}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://..."
            autoFocus
            className="mb-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
          />
          {detectedType ? (
            <p className="mb-2 text-xs text-zinc-400">Detected: {detectedType}</p>
          ) : null}
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Preview"
              className="mb-2 w-full rounded-lg"
            />
          ) : null}
          <input
            type="text"
            value={addTitle}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Title (optional)"
            className="mb-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
          />
          <input
            type="text"
            value={addCaption}
            onChange={(event) => onCaptionChange(event.target.value)}
            placeholder="Caption (optional)"
            className="mb-4 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!detectedType}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
