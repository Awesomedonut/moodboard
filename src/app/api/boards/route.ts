import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const BOARDS_FILE = path.join(process.cwd(), "data", "boards.json");
const BOARDS_DIR = path.join(process.cwd(), "data", "boards");

interface Board {
  id: string;
  name: string;
  createdAt: string;
}

function readBoards(): Board[] {
  const raw = fs.readFileSync(BOARDS_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeBoards(data: Board[]) {
  fs.writeFileSync(BOARDS_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  const boards = readBoards();

  const boardsWithCover = boards.map((board) => {
    const boardFile = path.join(BOARDS_DIR, `${board.id}.json`);
    let cover = null;
    if (fs.existsSync(boardFile)) {
      const images = JSON.parse(fs.readFileSync(boardFile, "utf-8"));
      if (images.length > 0) {
        cover = images[0].filename;
      }
    }
    return { ...board, cover };
  });

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

  const boards = readBoards();
  boards.push(board);
  writeBoards(boards);

  fs.writeFileSync(path.join(BOARDS_DIR, `${id}.json`), "[]");

  return NextResponse.json(board, { status: 201 });
}
