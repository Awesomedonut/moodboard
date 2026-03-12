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

export default function MoodBoard({ boardId }: { boardId: string }) {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BoardItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkCaption, setLinkCaption] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeCaption, setYoutubeCaption] = useState("");
  const addMenuRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async () => {
    const res = await fetch(`/api/boards/${boardId}/images`);
    const data = await res.json();
    setItems(data);
  }, [boardId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedItem(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
    setCaptions({});
    setShowAddMenu(false);
    e.target.value = "";
  }

  async function handleConfirmUpload() {
    setUploading(true);

    for (const file of pendingFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^.]+$/, ""));
      formData.append("caption", captions[file.name] || "");

      await fetch(`/api/boards/${boardId}/images`, {
        method: "POST",
        body: formData,
      });
    }

    setPendingFiles([]);
    setCaptions({});
    await fetchItems();
    setUploading(false);
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    await fetch(`/api/boards/${boardId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "link",
        url: linkUrl.trim(),
        title: linkTitle.trim() || linkUrl.trim(),
        caption: linkCaption.trim(),
      }),
    });

    setLinkUrl("");
    setLinkTitle("");
    setLinkCaption("");
    setShowLinkModal(false);
    await fetchItems();
  }

  async function handleAddYoutube(e: React.FormEvent) {
    e.preventDefault();
    if (!youtubeUrl.trim() || !getYouTubeId(youtubeUrl)) return;

    await fetch(`/api/boards/${boardId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "youtube",
        url: youtubeUrl.trim(),
        title: "",
        caption: youtubeCaption.trim(),
      }),
    });

    setYoutubeUrl("");
    setYoutubeCaption("");
    setShowYoutubeModal(false);
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
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
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + Add
          </button>
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              <label className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                Images
                <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" disabled={uploading} />
              </label>
              <button
                onClick={() => { setShowLinkModal(true); setShowAddMenu(false); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Link
              </button>
              <button
                onClick={() => { setShowYoutubeModal(true); setShowAddMenu(false); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                  <path d="m10 15 5-3-5-3z" />
                </svg>
                YouTube
              </button>
            </div>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-32 text-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <p className="text-lg">Nothing here yet</p>
          <p className="text-sm">Click &quot;+ Add&quot; to get started</p>
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

      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowLinkModal(false)}
        >
          <form
            onSubmit={handleAddLink}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-zinc-900"
          >
            <h2 className="mb-4 text-lg font-semibold">Add Link</h2>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              required
              autoFocus
              className="mb-3 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
            />
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Title (optional)"
              className="mb-3 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
            />
            <input
              type="text"
              value={linkCaption}
              onChange={(e) => setLinkCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="mb-4 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      {showYoutubeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowYoutubeModal(false)}
        >
          <form
            onSubmit={handleAddYoutube}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-zinc-900"
          >
            <h2 className="mb-4 text-lg font-semibold">Add YouTube Video</h2>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              required
              autoFocus
              className="mb-3 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
            />
            {youtubeUrl && getYouTubeId(youtubeUrl) && (
              <img
                src={`https://img.youtube.com/vi/${getYouTubeId(youtubeUrl)}/hqdefault.jpg`}
                alt="Preview"
                className="mb-3 w-full rounded-lg"
              />
            )}
            <input
              type="text"
              value={youtubeCaption}
              onChange={(e) => setYoutubeCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="mb-4 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowYoutubeModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!youtubeUrl || !getYouTubeId(youtubeUrl)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
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
                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
              {selectedItem.caption && (
                <p className="text-sm text-white/50">
                  {selectedItem.caption}
                </p>
              )}
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
