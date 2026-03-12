"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AddItemModal } from "@/components/moodboard/AddItemModal";
import { BoardItemThumbnail } from "@/components/moodboard/BoardItemPreview";
import { PendingUploadsModal } from "@/components/moodboard/PendingUploadsModal";
import { SelectedItemModal } from "@/components/moodboard/SelectedItemModal";
import { useBoardItems } from "@/components/moodboard/useBoardItems";
import { isHttpUrl } from "@/lib/media";
import type { BoardItem } from "@/lib/types";

interface MoodBoardProps {
  boardId: string;
}

function reorderItems(items: BoardItem[], sourceId: string, targetId: string): BoardItem[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items;
  }

  const reorderedItems = [...items];
  const [movedItem] = reorderedItems.splice(sourceIndex, 1);
  reorderedItems.splice(targetIndex, 0, movedItem);

  return reorderedItems;
}

export default function MoodBoard({ boardId }: MoodBoardProps) {
  const {
    addUrlItem,
    deleteItem,
    error,
    isUploading,
    items,
    refreshItems,
    reorderItems: persistReorderedItems,
    saveCaption,
    setError,
    uploadFiles,
  } = useBoardItems(boardId);

  const [addCaption, setAddCaption] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editCaptionValue, setEditCaptionValue] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedItem, setSelectedItem] = useState<BoardItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeSelectedItem = useCallback(() => {
    setSelectedItem(null);
    setEditingCaption(false);
  }, []);

  const resetAddForm = useCallback(() => {
    setAddUrl("");
    setAddCaption("");
  }, []);

  const clearPendingFiles = useCallback(() => {
    setPendingFiles([]);
    setCaptions({});
  }, []);

  useEffect(() => {
    void Promise.resolve()
      .then(refreshItems)
      .catch(() => setError("Could not load board items."));
  }, [refreshItems, setError]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSelectedItem();
        setShowAddModal(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSelectedItem]);

  function createClipboardImageFile(file: File): File {
    if (file.name) {
      return file;
    }

    const extension = file.type.split("/")[1] || "png";
    return new File([file], `pasted-image-${Date.now()}.${extension}`, {
      type: file.type || "image/png",
      lastModified: Date.now(),
    });
  }

  useEffect(() => {
    async function handlePaste(event: ClipboardEvent) {
      if (showAddModal || selectedItem || pendingFiles.length > 0) {
        return;
      }

      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        return;
      }

      const imageFiles: File[] = Array.from(clipboardData.files)
        .filter((file) => file.type.startsWith("image/"))
        .map(createClipboardImageFile);
      let textData = "";

      for (const item of Array.from(clipboardData.items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file && imageFiles.every((existingFile) => existingFile.size !== file.size)) {
            imageFiles.push(createClipboardImageFile(file));
          }
          continue;
        }

        if (item.type === "text/plain") {
          textData = await new Promise<string>((resolve) => item.getAsString(resolve));
        }
      }

      if (imageFiles.length > 0) {
        event.preventDefault();
        setPendingFiles(imageFiles);
        setCaptions({});
        return;
      }

      const url = textData.trim();
      if (!isHttpUrl(url)) {
        return;
      }

      event.preventDefault();
      await addUrlItem(url, "");
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addUrlItem, pendingFiles.length, selectedItem, showAddModal, uploadFiles]);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setPendingFiles(Array.from(files));
    setCaptions({});
    setShowAddModal(false);
    event.target.value = "";
  }

  async function handleConfirmUpload() {
    await uploadFiles(pendingFiles, captions);
    clearPendingFiles();
  }

  async function handleAddUrl(event: React.FormEvent) {
    event.preventDefault();

    const url = addUrl.trim();
    if (!isHttpUrl(url)) {
      setError("Please enter a valid URL.");
      return;
    }

    await addUrlItem(url, addCaption.trim());
    resetAddForm();
    setShowAddModal(false);
  }

  function handleDragStart(itemId: string) {
    setDragId(itemId);
  }

  function handleDragOver(event: React.DragEvent, itemId: string) {
    event.preventDefault();
    if (itemId !== dragId) {
      setDragOverId(itemId);
    }
  }

  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }

    const reorderedItems = reorderItems(items, dragId, targetId);
    setDragId(null);
    setDragOverId(null);
    await persistReorderedItems(reorderedItems);
  }

  function handleBoardDragOver(event: React.DragEvent) {
    if (dragId) {
      return;
    }

    event.preventDefault();
    setDropActive(true);
  }

  function handleBoardDragLeave(event: React.DragEvent) {
    if (event.currentTarget === event.target || !event.currentTarget.contains(event.relatedTarget as Node)) {
      setDropActive(false);
    }
  }

  function handleBoardDrop(event: React.DragEvent) {
    if (dragId) {
      return;
    }

    event.preventDefault();
    setDropActive(false);

    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length > 0) {
      setPendingFiles(files);
      setCaptions({});
    }
  }

  async function handleSaveCaption() {
    if (!selectedItem) {
      return;
    }

    const updatedItem = await saveCaption(selectedItem.id, editCaptionValue);
    setEditingCaption(false);
    setSelectedItem(updatedItem);
  }

  async function handleDelete(itemId: string) {
    await deleteItem(itemId);
    closeSelectedItem();
  }

  return (
    <div
      className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 ${dropActive ? "ring-4 ring-inset ring-blue-400" : ""}`}
      onDragOver={handleBoardDragOver}
      onDragLeave={handleBoardDragLeave}
      onDrop={handleBoardDrop}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Board</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/boards/${boardId}/download`}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + Add
          </button>
        </div>
      </header>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isUploading ? (
        <div className="border-b border-zinc-200 bg-blue-50 px-6 py-2 text-center text-sm text-blue-600 dark:border-zinc-800 dark:bg-blue-950 dark:text-blue-400">
          Uploading...
        </div>
      ) : null}

      {items.length === 0 && !isUploading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-32 text-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <p className="text-lg">Nothing here yet</p>
          <p className="text-sm">Paste an image or URL, drag files in, or click &quot;+ Add&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={(event) => handleDragOver(event, item.id)}
              onDrop={() => handleDrop(item.id)}
              onDragEnd={() => {
                setDragId(null);
                setDragOverId(null);
              }}
              className={`cursor-grab active:cursor-grabbing ${
                dragId === item.id ? "opacity-40" : ""
              } ${
                dragOverId === item.id ? "rounded-lg ring-2 ring-zinc-400" : ""
              }`}
            >
              <button
                onClick={() => setSelectedItem(item)}
                className="block w-full overflow-hidden rounded-lg bg-white text-left transition-shadow hover:shadow-lg focus:outline-none dark:bg-zinc-900"
              >
                <BoardItemThumbnail item={item} />
                {item.caption ? (
                  <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {item.caption}
                  </p>
                ) : null}
              </button>
            </div>
          ))}
        </div>
      )}

      <AddItemModal
        addCaption={addCaption}
        addUrl={addUrl}
        isOpen={showAddModal}
        onAddUrl={handleAddUrl}
        onCaptionChange={setAddCaption}
        onClose={() => setShowAddModal(false)}
        onOpenFilePicker={() => fileInputRef.current?.click()}
        onUrlChange={setAddUrl}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <PendingUploadsModal
        captions={captions}
        files={pendingFiles}
        isUploading={isUploading}
        onCancel={clearPendingFiles}
        onCaptionChange={(fileName, value) =>
          setCaptions((currentCaptions) => ({ ...currentCaptions, [fileName]: value }))
        }
        onConfirm={handleConfirmUpload}
      />

      <SelectedItemModal
        editCaptionValue={editCaptionValue}
        isEditingCaption={editingCaption}
        item={selectedItem}
        onCaptionChange={setEditCaptionValue}
        onClose={closeSelectedItem}
        onDelete={handleDelete}
        onEditStart={() => {
          if (!selectedItem) {
            return;
          }

          setEditingCaption(true);
          setEditCaptionValue(selectedItem.caption);
        }}
        onSaveCaption={handleSaveCaption}
      />
    </div>
  );
}
