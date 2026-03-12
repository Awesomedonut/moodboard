export interface Board {
  id: string;
  name: string;
  createdAt: string;
}

export interface BoardSummary extends Board {
  cover: string | null;
}

export type BoardItemType = "image" | "link" | "youtube";

export interface BoardItem {
  id: string;
  type: BoardItemType;
  url: string;
  title: string;
  caption: string;
  createdAt: string;
}
