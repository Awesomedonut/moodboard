"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface BoardItem {
  id: string;
  type: "image" | "link" | "youtube";
  url: string;
  title: string;
  caption: string;
  createdAt: string;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function MoodBoard({ boardId }: { boardId: string }) {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BoardItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editCaptionValue, setEditCaptionValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addCaption, setAddCaption] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    const res = await fetch(`/api/boards/${boardId}/images`);
    const data = await res.json();
    setItems(data);
  }, [boardId]);

  useEffect(() => {
    void Promise.resolve().then(fetchItems);
  }, [fetchItems]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedItem(null);
        setShowAddModal(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function uploadFile(file: File, caption = "") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^.]+$/, ""));
    formData.append("caption", caption);
    await fetch(`/api/boards/${boardId}/images`, {
      method: "POST",
      body: formData,
    });
  }

  async function addUrlItem(url: string, title: string, caption: string) {
    const type = getYouTubeId(url) ? "youtube" : "link";
    await fetch(`/api/boards/${boardId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, url, title: title || url, caption }),
    });
  }

  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      if (showAddModal || selectedItem || pendingFiles.length > 0) return;

      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      const imageFiles: File[] = [];
      let textData = "";

      for (const item of Array.from(clipboardItems)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        } else if (item.type === "text/plain") {
          textData = await new Promise<string>((resolve) => item.getAsString(resolve));
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        setUploading(true);
        for (const file of imageFiles) {
          await uploadFile(file);
        }
        await fetchItems();
        setUploading(false);
        return;
      }

      if (textData.trim() && isUrl(textData.trim())) {
        e.preventDefault();
        const url = textData.trim();
        await addUrlItem(url, "", "");
        await fetchItems();
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [boardId, showAddModal, selectedItem, pendingFiles.length, fetchItems]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
    setCaptions({});
    setShowAddModal(false);
    e.target.value = "";
  }

  async function handleConfirmUpload() {
    setUploading(true);
    for (const file of pendingFiles) {
      await uploadFile(file, captions[file.name] || "");
    }
    setPendingFiles([]);
    setCaptions({});
    await fetchItems();
    setUploading(false);
  }

  async function handleAddUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!addUrl.trim()) return;
    const url = addUrl.trim();

    if (!isUrl(url)) return;

    await addUrlItem(url, addTitle.trim(), addCaption.trim());
    setAddUrl("");
    setAddTitle("");
    setAddCaption("");
    setShowAddModal(false);
    await fetchItems();
  }

  function handleDragStart(id: string) {
    setDragId(id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (id !== dragId) setDragOverId(id);
  }

  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === dragId);
    const newIndex = items.findIndex((item) => item.id === targetId);
    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    setItems(reordered);
    setDragId(null);
    setDragOverId(null);

    await fetch(`/api/boards/${boardId}/images`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((item) => item.id) }),
    });
  }

  function handleBoardDragOver(e: React.DragEvent) {
    if (dragId) return;
    e.preventDefault();
    setDropActive(true);
  }

  function handleBoardDragLeave(e: React.DragEvent) {
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropActive(false);
    }
  }

  async function handleBoardDrop(e: React.DragEvent) {
    if (dragId) return;
    e.preventDefault();
    setDropActive(false);

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) {
      setPendingFiles(files);
      setCaptions({});
    }
  }

  async function handleSaveCaption() {
    if (!selectedItem) return;
    await fetch(`/api/boards/${boardId}/images/${selectedItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: editCaptionValue }),
    });
    setEditingCaption(false);
    setSelectedItem({ ...selectedItem, caption: editCaptionValue });
    await fetchItems();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/boards/${boardId}/images/${id}`, { method: "DELETE" });
    setSelectedItem(null);
    await fetchItems();
  }

  function renderThumbnail(item: BoardItem) {
    if (item.type === "youtube") {
      const videoId = getYouTubeId(item.url);
      return (
        <div className="relative aspect-video w-full bg-black">
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="YouTube video"
            className="h-full w-full object-cover"
            loading="lazy"
          />
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

  function renderExpanded(item: BoardItem) {
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

  const detectedType = addUrl.trim() && isUrl(addUrl.trim())
    ? getYouTubeId(addUrl.trim()) ? "YouTube video" : "Link"
    : null;

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

      {uploading && (
        <div className="border-b border-zinc-200 bg-blue-50 px-6 py-2 text-center text-sm text-blue-600 dark:border-zinc-800 dark:bg-blue-950 dark:text-blue-400">
          Uploading...
        </div>
      )}

      {items.length === 0 && !uploading ? (
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
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDrop={() => handleDrop(item.id)}
              onDragEnd={() => { setDragId(null); setDragOverId(null); }}
              className={`cursor-grab active:cursor-grabbing ${
                dragId === item.id ? "opacity-40" : ""
              } ${
                dragOverId === item.id ? "ring-2 ring-zinc-400 rounded-lg" : ""
              }`}
            >
              <button
                onClick={() => setSelectedItem(item)}
                className="block w-full overflow-hidden rounded-lg bg-white text-left transition-shadow hover:shadow-lg focus:outline-none dark:bg-zinc-900"
              >
                {renderThumbnail(item)}
                {item.caption && (
                  <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {item.caption}
                  </p>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold">Add to Board</h2>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              Choose images or drag them onto the board
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
              <span className="text-xs text-zinc-400">or paste a URL</span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <form onSubmit={handleAddUrl}>
              <input
                type="text"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder="https://..."
                autoFocus
                className="mb-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
              />
              {detectedType && (
                <p className="mb-2 text-xs text-zinc-400">
                  Detected: {detectedType}
                </p>
              )}
              {addUrl && getYouTubeId(addUrl) && (
                <img
                  src={`https://img.youtube.com/vi/${getYouTubeId(addUrl)}/hqdefault.jpg`}
                  alt="Preview"
                  className="mb-2 w-full rounded-lg"
                />
              )}
              <input
                type="text"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="Title (optional)"
                className="mb-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
              />
              <input
                type="text"
                value={addCaption}
                onChange={(e) => setAddCaption(e.target.value)}
                placeholder="Caption (optional)"
                className="mb-4 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
      )}

      {pendingFiles.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPendingFiles([])}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold">Add Captions</h2>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto">
              {pendingFiles.map((file) => (
                <div key={file.name} className="flex items-start gap-3">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-16 w-16 shrink-0 rounded-md object-cover"
                  />
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-medium">{file.name}</p>
                    <input
                      type="text"
                      placeholder="Caption (optional)"
                      value={captions[file.name] || ""}
                      onChange={(e) =>
                        setCaptions((prev) => ({ ...prev, [file.name]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingFiles([])}
                className="rounded-lg px-4 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => { setSelectedItem(null); setEditingCaption(false); }}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {renderExpanded(selectedItem)}
            <div className="mt-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/70">
                  {selectedItem.title}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingCaption(true);
                      setEditCaptionValue(selectedItem.caption);
                    }}
                    className="rounded-md bg-white/10 px-3 py-1 text-sm text-white transition-colors hover:bg-white/20"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedItem.id)}
                    className="rounded-md bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editingCaption ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editCaptionValue}
                    onChange={(e) => setEditCaptionValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveCaption(); }}
                    autoFocus
                    placeholder="Caption"
                    className="flex-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-sm text-white outline-none focus:border-white/40"
                  />
                  <button
                    onClick={handleSaveCaption}
                    className="rounded-md bg-white/20 px-3 py-1 text-sm text-white transition-colors hover:bg-white/30"
                  >
                    Save
                  </button>
                </div>
              ) : selectedItem.caption ? (
                <p className="text-sm text-white/50">
                  {selectedItem.caption}
                </p>
              ) : null}
            </div>
          </div>

          <button
            onClick={() => setSelectedItem(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
