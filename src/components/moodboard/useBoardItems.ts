"use client";

import { useCallback, useState } from "react";
import {
  createBoardUrlItem,
  deleteBoardItem,
  fetchBoardItems,
  reorderBoardItems,
  updateBoardItemCaption,
  uploadBoardImage,
} from "@/lib/boards-client";
import type { BoardItem } from "@/lib/types";

export function useBoardItems(boardId: string) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [items, setItems] = useState<BoardItem[]>([]);

  const refreshItems = useCallback(async () => {
    const nextItems = await fetchBoardItems(boardId);
    setItems(nextItems);
  }, [boardId]);

  const withErrorHandling = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    setError(null);

    try {
      return await action();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Something went wrong.";
      setError(message);
      throw requestError;
    }
  }, []);

  const addUrlItem = useCallback(
    async (url: string, title: string, caption: string) => {
      await withErrorHandling(async () => {
        await createBoardUrlItem(boardId, url, title, caption);
        await refreshItems();
      });
    },
    [boardId, refreshItems, withErrorHandling]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      await withErrorHandling(async () => {
        await deleteBoardItem(boardId, itemId);
        await refreshItems();
      });
    },
    [boardId, refreshItems, withErrorHandling]
  );

  const saveCaption = useCallback(
    async (itemId: string, caption: string) => {
      const updatedItem = await withErrorHandling(() =>
        updateBoardItemCaption(boardId, itemId, caption)
      );

      setItems((currentItems) =>
        currentItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );

      return updatedItem;
    },
    [boardId, withErrorHandling]
  );

  const uploadFiles = useCallback(
    async (files: File[], captions: Record<string, string>) => {
      setIsUploading(true);

      try {
        await withErrorHandling(async () => {
          for (const file of files) {
            await uploadBoardImage(boardId, file, captions[file.name] || "");
          }

          await refreshItems();
        });
      } finally {
        setIsUploading(false);
      }
    },
    [boardId, refreshItems, withErrorHandling]
  );

  const reorderItems = useCallback(
    async (orderedItems: BoardItem[]) => {
      setItems(orderedItems);

      try {
        await withErrorHandling(() =>
          reorderBoardItems(
            boardId,
            orderedItems.map((item) => item.id)
          )
        );
      } catch {
        await refreshItems();
      }
    },
    [boardId, refreshItems, withErrorHandling]
  );

  return {
    addUrlItem,
    deleteItem,
    error,
    isUploading,
    items,
    refreshItems,
    reorderItems,
    saveCaption,
    setError,
    uploadFiles,
  };
}
