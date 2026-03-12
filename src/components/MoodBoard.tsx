"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ImageEntry {
  id: string;
  url: string;
  title: string;
  caption: string;
  createdAt: string;
}

export default function MoodBoard({ boardId }: { boardId: string }) {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageEntry | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    const res = await fetch(`/api/boards/${boardId}/images`);
    const data = await res.json();
    setImages(data);
  }, [boardId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedImage(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
    setCaptions({});
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
    await fetchImages();
    setUploading(false);
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

    const oldIndex = images.findIndex((img) => img.id === dragId);
    const newIndex = images.findIndex((img) => img.id === targetId);
    const reordered = [...images];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    setImages(reordered);
    setDragId(null);
    setDragOverId(null);

    await fetch(`/api/boards/${boardId}/images`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((img) => img.id) }),
    });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/boards/${boardId}/images/${id}`, { method: "DELETE" });
    setSelectedImage(null);
    await fetchImages();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Board</h1>
        </div>
        <label className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
          {uploading ? "Uploading..." : "+ Add Images"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </header>

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-32 text-zinc-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <p className="text-lg">No images yet</p>
          <p className="text-sm">Click &quot;+ Add Images&quot; to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleDragStart(img.id)}
              onDragOver={(e) => handleDragOver(e, img.id)}
              onDrop={() => handleDrop(img.id)}
              onDragEnd={() => { setDragId(null); setDragOverId(null); }}
              className={`cursor-grab active:cursor-grabbing ${
                dragId === img.id ? "opacity-40" : ""
              } ${
                dragOverId === img.id ? "ring-2 ring-zinc-400 rounded-lg" : ""
              }`}
            >
              <button
                onClick={() => setSelectedImage(img)}
                className="block w-full overflow-hidden rounded-lg bg-white transition-shadow hover:shadow-lg focus:outline-none dark:bg-zinc-900"
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full object-cover"
                  loading="lazy"
                />
                {img.caption && (
                  <p className="px-3 py-2 text-left text-sm text-zinc-500 dark:text-zinc-400">
                    {img.caption}
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

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            <div className="mt-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/70">
                  {selectedImage.title}
                </p>
                <button
                  onClick={() => handleDelete(selectedImage.id)}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
              {selectedImage.caption && (
                <p className="text-sm text-white/50">
                  {selectedImage.caption}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
