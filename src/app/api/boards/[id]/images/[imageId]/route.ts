import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BOARDS_DIR = path.join(process.cwd(), "data", "boards");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

interface ImageEntry {
  id: string;
  filename: string;
  title: string;
  createdAt: string;
}

function readImages(boardId: string): ImageEntry[] {
  const file = path.join(BOARDS_DIR, `${boardId}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeImages(boardId: string, data: ImageEntry[]) {
  fs.writeFileSync(path.join(BOARDS_DIR, `${boardId}.json`), JSON.stringify(data, null, 2));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
  const images = readImages(id);
  const entry = images.find((img) => img.id === imageId);

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(UPLOADS_DIR, entry.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const updated = images.filter((img) => img.id !== imageId);
  writeImages(id, updated);

  return NextResponse.json({ success: true });
}
