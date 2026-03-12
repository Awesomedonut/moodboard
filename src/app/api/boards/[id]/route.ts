import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BOARDS_FILE = path.join(process.cwd(), "data", "boards.json");
const BOARDS_DIR = path.join(process.cwd(), "data", "boards");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

interface Board {
  id: string;
  name: string;
  createdAt: string;
}

interface ImageEntry {
  id: string;
  filename: string;
  title: string;
  createdAt: string;
}

function readBoards(): Board[] {
  return JSON.parse(fs.readFileSync(BOARDS_FILE, "utf-8"));
}

function writeBoards(data: Board[]) {
  fs.writeFileSync(BOARDS_FILE, JSON.stringify(data, null, 2));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const boards = readBoards();
  const board = boards.find((b) => b.id === id);

  if (!board) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const boardFile = path.join(BOARDS_DIR, `${id}.json`);
  if (fs.existsSync(boardFile)) {
    const images: ImageEntry[] = JSON.parse(fs.readFileSync(boardFile, "utf-8"));
    for (const img of images) {
      const filePath = path.join(UPLOADS_DIR, img.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    fs.unlinkSync(boardFile);
  }

  const updated = boards.filter((b) => b.id !== id);
  writeBoards(updated);

  return NextResponse.json({ success: true });
}
