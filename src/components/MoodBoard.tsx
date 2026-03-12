"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ImageEntry {
  id: string;
  filename: string;
  title: string;
  createdAt: string;
}

export default function MoodBoard({ boardId }: { boardId: string }) {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageEntry | null>(null);
  const [uploading, setUploading] = useState(false);

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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^.]+$/, ""));

      await fetch(`/api/boards/${boardId}/images`, {
        method: "POST",
        body: formData,
      });
    }

    e.target.value = "";
    await fetchImages();
    setUploading(false);
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
            onChange={handleUpload}
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
        <div className="columns-1 gap-6 p-6 sm:columns-1 md:columns-2 lg:columns-3">
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setSelectedImage(img)}
              className="mb-4 block w-full overflow-hidden rounded-lg transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <img
                src={`/api/uploads/${img.filename}`}
                alt={img.title}
                className="w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
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
              src={`/api/uploads/${selectedImage.filename}`}
              alt={selectedImage.title}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            <div className="mt-3 flex items-center justify-between">
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
