import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readBoards, writeBoards, readImages, Board } from "@/lib/storage";

export async function GET() {
  const boards = await readBoards();

  const boardsWithCover = await Promise.all(
    boards.map(async (board) => {
      const images = await readImages(board.id);
      const cover = images.length > 0 ? images[0].url : null;
      return { ...board, cover };
    })
  );

  return NextResponse.json(boardsWithCover);
}

export async function POST(req: NextRequest) {
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

  const boards = await readBoards();
  boards.push(board);
  await writeBoards(boards);

  return NextResponse.json(board, { status: 201 });
}
