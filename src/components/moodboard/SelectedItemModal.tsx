"use client";

import { BoardItemExpanded } from "@/components/moodboard/BoardItemPreview";
import type { BoardItem } from "@/lib/types";

interface SelectedItemModalProps {
  editCaptionValue: string;
  isEditingCaption: boolean;
  item: BoardItem | null;
  onCaptionChange: (value: string) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEditStart: () => void;
  onSaveCaption: () => void;
}

export function SelectedItemModal({
  editCaptionValue,
  isEditingCaption,
  item,
  onCaptionChange,
  onClose,
  onDelete,
  onEditStart,
  onSaveCaption,
}: SelectedItemModalProps) {
  if (!item) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <BoardItemExpanded item={item} />
        <div className="mt-3 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/70">{item.title}</p>
            <div className="flex gap-2">
              <button
                onClick={onEditStart}
                className="rounded-md bg-white/10 px-3 py-1 text-sm text-white transition-colors hover:bg-white/20"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="rounded-md bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
          {isEditingCaption ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editCaptionValue}
                onChange={(event) => onCaptionChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onSaveCaption();
                  }
                }}
                autoFocus
                placeholder="Caption"
                className="flex-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-sm text-white outline-none focus:border-white/40"
              />
              <button
                onClick={onSaveCaption}
                className="rounded-md bg-white/20 px-3 py-1 text-sm text-white transition-colors hover:bg-white/30"
              >
                Save
              </button>
            </div>
          ) : item.caption ? (
            <p className="text-sm text-white/50">{item.caption}</p>
          ) : null}
        </div>
      </div>

      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
