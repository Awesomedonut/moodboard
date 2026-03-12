import { put, del, list } from "@vercel/blob";

export interface Board {
  id: string;
  name: string;
  createdAt: string;
}

export interface ImageEntry {
  id: string;
  url: string;
  title: string;
  caption: string;
  createdAt: string;
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  const { blobs } = await list({ prefix: path });
  const match = blobs.find((b) => b.pathname === path);
  if (!match) return fallback;
  const res = await fetch(match.url);
  return res.json();
}

async function writeJson(path: string, data: unknown): Promise<void> {
  const { blobs } = await list({ prefix: path });
  const existing = blobs.find((b) => b.pathname === path);
  if (existing) await del(existing.url);
  await put(path, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function readBoards(): Promise<Board[]> {
  return readJson<Board[]>("meta/boards.json", []);
}

export async function writeBoards(boards: Board[]): Promise<void> {
  await writeJson("meta/boards.json", boards);
}

export async function readImages(boardId: string): Promise<ImageEntry[]> {
  return readJson<ImageEntry[]>(`meta/board-${boardId}.json`, []);
}

export async function writeImages(boardId: string, images: ImageEntry[]): Promise<void> {
  await writeJson(`meta/board-${boardId}.json`, images);
}

export async function deleteMetaBlob(path: string): Promise<void> {
  const { blobs } = await list({ prefix: path });
  const match = blobs.find((b) => b.pathname === path);
  if (match) await del(match.url);
}

export { put, del } from "@vercel/blob";
