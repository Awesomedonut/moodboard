import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const images = readImages(id);
  return NextResponse.json(images);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = path.extname(file.name) || ".png";
  const imageId = randomUUID();
  const filename = `${imageId}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

  const entry: ImageEntry = {
    id: imageId,
    filename,
    title,
    createdAt: new Date().toISOString(),
  };

  const images = readImages(id);
  images.push(entry);
  writeImages(id, images);

  return NextResponse.json(entry, { status: 201 });
}
