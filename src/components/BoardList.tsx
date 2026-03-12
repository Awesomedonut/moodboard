"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Board {
  id: string;
  name: string;
  cover: string | null;
  createdAt: string;
}

export default function BoardList() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = useCallback(async () => {
    const res = await fetch("/api/boards");
    if (!res.ok) {
      throw new Error("Failed to load boards");
    }

    const data = await res.json();
    setBoards(data);
  }, []);

  useEffect(() => {
    void Promise.resolve()
      .then(fetchBoards)
      .catch(() => setError("Could not load boards."));
  }, [fetchBoards]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setError(null);

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Could not create board.");
      return;
    }

    setNewName("");
    setCreating(false);
    await fetchBoards().catch(() => setError("Board created, but refresh failed."));
  }

  async function handleDelete(id: string) {
    setError(null);

    const res = await fetch(`/api/boards/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not delete board.");
      return;
    }

    await fetchBoards().catch(() => setError("Board deleted, but refresh failed."));
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <h1 className="text-xl font-semibold tracking-tight">Moodboard</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New Board
        </button>
      </header>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setCreating(false)}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-zinc-900"
          >
            <h2 className="mb-4 text-lg font-semibold">New Board</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Board name"
              autoFocus
              className="mb-4 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {boards.length === 0 ? (
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
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
          </svg>
          <p className="text-lg">No boards yet</p>
          <p className="text-sm">Click &quot;+ New Board&quot; to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {boards.map((board) => (
            <div key={board.id} className="group relative">
              <Link
                href={`/board/${board.id}`}
                className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-800">
                  {board.cover ? (
                    <img
                      src={board.cover}
                      alt={board.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
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
                    </div>
                  )}
                </div>
                <div className="px-4 py-3">
                  <p className="font-medium">{board.name}</p>
                </div>
              </Link>
              <button
                onClick={() => handleDelete(board.id)}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
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
          ))}
        </div>
      )}
    </div>
  );
}
