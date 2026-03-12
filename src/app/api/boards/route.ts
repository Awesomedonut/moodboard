import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createBoard, readBoards, readItems } from "@/lib/storage";
import type { Board } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const boards = await readBoards();

    const boardsWithCover = await Promise.all(
      boards.map(async (board) => {
        const items = await readItems(board.id);
        const firstImage = items.find((i) => i.type === "image");
        const cover = firstImage ? firstImage.url : null;
        return { ...board, cover };
      })
    );

    return NextResponse.json(boardsWithCover);
  } catch (error) {
    console.error("Failed to load boards", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load boards" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = randomUUID();
    const board: Board = {
      id,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    await createBoard(board);

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error("Failed to create board", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create board" },
      { status: 500 }
    );
  }
}
