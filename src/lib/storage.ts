import { promises as fs } from "fs";
import path from "path";
import { del, list, put } from "@vercel/blob";
import type { Board, BoardItem } from "@/lib/types";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");
const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const LEGACY_BOARDS_PATH = "meta/boards.json";

function getLocalPath(blobPath: string): string {
  return path.join(LOCAL_DATA_DIR, blobPath);
}

function getBoardPath(boardId: string): string {
  return `meta/boards/${boardId}.json`;
}

function getBoardItemsPrefix(boardId: string): string {
  return `meta/boards/${boardId}/items/`;
}

function getBoardItemPath(boardId: string, itemId: string): string {
  return `${getBoardItemsPrefix(boardId)}${itemId}.json`;
}

function getBoardOrderPath(boardId: string): string {
  return `meta/boards/${boardId}/order.json`;
}

function getLegacyItemsPath(boardId: string): string {
  return `meta/board-${boardId}.json`;
}

function isJsonPath(filePath: string): boolean {
  return filePath.endsWith(".json");
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
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

async function deleteLocalDirectory(blobPrefix: string): Promise<void> {
  await fs.rm(getLocalPath(blobPrefix), { recursive: true, force: true });
}

async function listLocalFiles(blobPrefix: string): Promise<string[]> {
  const startPath = getLocalPath(blobPrefix);

  try {
    const stats = await fs.stat(startPath);
    if (stats.isFile()) {
      return [blobPrefix];
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const results: string[] = [];

  async function walk(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const nextPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(nextPath);
        continue;
      }

      const relativePath = path.relative(LOCAL_DATA_DIR, nextPath);
      results.push(relativePath.split(path.sep).join("/"));
    }
  }

  await walk(startPath);
  return results.sort();
}

async function listBlobFiles(blobPrefix: string): Promise<string[]> {
  const { blobs } = await list({ prefix: blobPrefix });
  return blobs.map((blob) => blob.pathname).sort();
}

async function listFiles(blobPrefix: string): Promise<string[]> {
  return hasBlobToken ? listBlobFiles(blobPrefix) : listLocalFiles(blobPrefix);
}

async function readJson<T>(blobPath: string, fallback: T): Promise<T> {
  if (!hasBlobToken) {
    return readLocalJson(blobPath, fallback);
  }

  const { blobs } = await list({ prefix: blobPath });
  const match = blobs.find((blob) => blob.pathname === blobPath);
  if (!match) {
    return fallback;
  }

  const response = await fetch(match.url, { cache: "no-store" });
  return response.json();
}

async function readManyJson<T>(blobPaths: string[]): Promise<T[]> {
  return Promise.all(blobPaths.map((blobPath) => readJson<T | null>(blobPath, null))).then(
    (items) => items.filter(Boolean) as T[]
  );
}

async function writeJson(blobPath: string, data: unknown): Promise<void> {
  if (!hasBlobToken) {
    await writeLocalJson(blobPath, data);
    return;
  }

  await put(blobPath, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function deleteMetaBlob(blobPath: string): Promise<void> {
  if (!hasBlobToken) {
    await deleteLocalFile(blobPath);
    return;
  }

  const { blobs } = await list({ prefix: blobPath });
  const match = blobs.find((blob) => blob.pathname === blobPath);
  if (match) {
    await del(match.url);
  }
}

async function deleteMetaPrefix(blobPrefix: string): Promise<void> {
  if (!hasBlobToken) {
    await deleteLocalDirectory(blobPrefix);
    return;
  }

  const filePaths = await listBlobFiles(blobPrefix);
  await Promise.all(
    filePaths.map(async (filePath) => {
      const { blobs } = await list({ prefix: filePath });
      const match = blobs.find((blob) => blob.pathname === filePath);
      if (match) {
        await del(match.url);
      }
    })
  );
}

export async function readBoards(): Promise<Board[]> {
  const boardPaths = (await listFiles("meta/boards/")).filter(
    (filePath) => isJsonPath(filePath) && !filePath.endsWith("/order.json") && !filePath.includes("/items/")
  );
  const nextBoards = await readManyJson<Board>(boardPaths);
  const legacyBoards = await readJson<Board[]>(LEGACY_BOARDS_PATH, []);
  return uniqueById([...nextBoards, ...legacyBoards]);
}

export async function createBoard(board: Board): Promise<void> {
  await writeJson(getBoardPath(board.id), board);
}

function orderBoardItems(items: BoardItem[], orderedIds: string[]): BoardItem[] {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const orderedItems = orderedIds
    .map((itemId) => itemMap.get(itemId))
    .filter(Boolean) as BoardItem[];
  const unorderedItems = items.filter((item) => !orderedIds.includes(item.id));
  return [...orderedItems, ...unorderedItems];
}

async function updateLegacyBoards(boardId: string): Promise<void> {
  const legacyBoards = await readJson<Board[]>(LEGACY_BOARDS_PATH, []);
  const updatedBoards = legacyBoards.filter((board) => board.id !== boardId);

  if (updatedBoards.length !== legacyBoards.length) {
    await writeJson(LEGACY_BOARDS_PATH, updatedBoards);
  }
}

async function migrateLegacyItemsToRecordStorage(boardId: string): Promise<void> {
  const legacyItems = await readJson<BoardItem[]>(getLegacyItemsPath(boardId), []);

  if (legacyItems.length === 0) {
    return;
  }

  await Promise.all(
    legacyItems.map((item) => writeJson(getBoardItemPath(boardId, item.id), item))
  );
  await writeJson(
    getBoardOrderPath(boardId),
    legacyItems.map((item) => item.id)
  );
  await deleteMetaBlob(getLegacyItemsPath(boardId));
}

export async function deleteBoardMeta(boardId: string): Promise<void> {
  await deleteMetaBlob(getBoardPath(boardId));
  await deleteMetaBlob(getBoardOrderPath(boardId));
  await deleteMetaPrefix(getBoardItemsPrefix(boardId));
  await deleteMetaBlob(getLegacyItemsPath(boardId));
  await updateLegacyBoards(boardId);
}

export async function readItems(boardId: string): Promise<BoardItem[]> {
  const itemPaths = (await listFiles(getBoardItemsPrefix(boardId))).filter(isJsonPath);
  const nextItems = await readManyJson<BoardItem>(itemPaths);
  const legacyItems = await readJson<BoardItem[]>(getLegacyItemsPath(boardId), []);
  const order = await readJson<string[]>(getBoardOrderPath(boardId), []);
  return orderBoardItems(uniqueById([...nextItems, ...legacyItems]), order);
}

export async function createBoardItem(boardId: string, item: BoardItem): Promise<void> {
  await migrateLegacyItemsToRecordStorage(boardId);
  await writeJson(getBoardItemPath(boardId, item.id), item);
  const items = await readItems(boardId);
  const orderedIds = items.map((entry) => entry.id);
  if (!orderedIds.includes(item.id)) {
    orderedIds.push(item.id);
  }
  await writeJson(getBoardOrderPath(boardId), orderedIds);
}

export async function updateBoardItem(boardId: string, item: BoardItem): Promise<void> {
  await migrateLegacyItemsToRecordStorage(boardId);
  await writeJson(getBoardItemPath(boardId, item.id), item);
}

export async function writeItemOrder(boardId: string, orderedIds: string[]): Promise<void> {
  await migrateLegacyItemsToRecordStorage(boardId);
  await writeJson(getBoardOrderPath(boardId), orderedIds);
}

export async function deleteBoardItemMeta(boardId: string, itemId: string): Promise<void> {
  await migrateLegacyItemsToRecordStorage(boardId);
  await deleteMetaBlob(getBoardItemPath(boardId, itemId));
  const items = await readItems(boardId);
  await writeJson(
    getBoardOrderPath(boardId),
    items.filter((item) => item.id !== itemId).map((item) => item.id)
  );
}

export { put, del } from "@vercel/blob";
