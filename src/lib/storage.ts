import { promises as fs } from "fs";
import path from "path";
import { put, del, list } from "@vercel/blob";
import type { Board, BoardItem } from "@/lib/types";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");
const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function getLocalPath(blobPath: string): string {
  return path.join(LOCAL_DATA_DIR, blobPath);
}

async function readLocalJson<T>(blobPath: string, fallback: T): Promise<T> {
  try {
    const file = await fs.readFile(getLocalPath(blobPath), "utf8");
    return JSON.parse(file) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeLocalJson(blobPath: string, data: unknown): Promise<void> {
  const localPath = getLocalPath(blobPath);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, JSON.stringify(data), "utf8");
}

async function deleteLocalFile(blobPath: string): Promise<void> {
  try {
    await fs.unlink(getLocalPath(blobPath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!hasBlobToken) {
    return readLocalJson(path, fallback);
  }

  const { blobs } = await list({ prefix: path });
  const match = blobs.find((b) => b.pathname === path);
  if (!match) return fallback;
  const res = await fetch(match.url, { cache: "no-store" });
  return res.json();
}

async function writeJson(path: string, data: unknown): Promise<void> {
  if (!hasBlobToken) {
    await writeLocalJson(path, data);
    return;
  }

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

export async function readItems(boardId: string): Promise<BoardItem[]> {
  return readJson<BoardItem[]>(`meta/board-${boardId}.json`, []);
}

export async function writeItems(boardId: string, items: BoardItem[]): Promise<void> {
  await writeJson(`meta/board-${boardId}.json`, items);
}

export async function deleteMetaBlob(path: string): Promise<void> {
  if (!hasBlobToken) {
    await deleteLocalFile(path);
    return;
  }

  const { blobs } = await list({ prefix: path });
  const match = blobs.find((b) => b.pathname === path);
  if (match) await del(match.url);
}

export { put, del } from "@vercel/blob";
