import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "moodboard.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

interface ImageEntry {
  id: string;
  filename: string;
  title: string;
  createdAt: string;
}

function readData(): ImageEntry[] {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeData(data: ImageEntry[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = readData();
  const entry = data.find((img) => img.id === id);

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(UPLOADS_DIR, entry.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const updated = data.filter((img) => img.id !== id);
  writeData(updated);

  return NextResponse.json({ success: true });
}
