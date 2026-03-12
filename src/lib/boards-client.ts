"use client";

import { detectItemType } from "@/lib/media";
import { parseJsonResponse } from "@/lib/http";
import type { Board, BoardItem, BoardSummary } from "@/lib/types";

export async function fetchBoards(): Promise<BoardSummary[]> {
  const response = await fetch("/api/boards");
  return parseJsonResponse<BoardSummary[]>(response);
}

export async function createBoard(name: string): Promise<Board> {
  const response = await fetch("/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  return parseJsonResponse<Board>(response);
}

export async function deleteBoard(id: string): Promise<void> {
  const response = await fetch(`/api/boards/${id}`, { method: "DELETE" });
  await parseJsonResponse<{ success: true }>(response);
}

export async function fetchBoardItems(boardId: string): Promise<BoardItem[]> {
  const response = await fetch(`/api/boards/${boardId}/images`);
  return parseJsonResponse<BoardItem[]>(response);
}

export async function uploadBoardImage(boardId: string, file: File, caption = ""): Promise<BoardItem> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", file.name.replace(/\.[^.]+$/, ""));
  formData.append("caption", caption);

  const response = await fetch(`/api/boards/${boardId}/images`, {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse<BoardItem>(response);
}

export async function createBoardUrlItem(
  boardId: string,
  url: string,
  title: string,
  caption: string
): Promise<BoardItem> {
  const type = detectItemType(url);

  if (!type) {
    throw new Error("Please enter a valid URL.");
  }

  const response = await fetch(`/api/boards/${boardId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, url, title: title || url, caption }),
  });

  return parseJsonResponse<BoardItem>(response);
}

export async function reorderBoardItems(boardId: string, orderedIds: string[]): Promise<BoardItem[]> {
  const response = await fetch(`/api/boards/${boardId}/images`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order: orderedIds }),
  });

  return parseJsonResponse<BoardItem[]>(response);
}

export async function updateBoardItemCaption(
  boardId: string,
  itemId: string,
  caption: string
): Promise<BoardItem> {
  const response = await fetch(`/api/boards/${boardId}/images/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caption }),
  });

  return parseJsonResponse<BoardItem>(response);
}

export async function deleteBoardItem(boardId: string, itemId: string): Promise<void> {
  const response = await fetch(`/api/boards/${boardId}/images/${itemId}`, { method: "DELETE" });
  await parseJsonResponse<{ success: true }>(response);
}
