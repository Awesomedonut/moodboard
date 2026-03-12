import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

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

export async function GET() {
  const images = readData();
  return NextResponse.json(images);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = path.extname(file.name) || ".png";
  const id = randomUUID();
  const filename = `${id}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

  const entry: ImageEntry = {
    id,
    filename,
    title,
    createdAt: new Date().toISOString(),
  };

  const data = readData();
  data.push(entry);
  writeData(data);

  return NextResponse.json(entry, { status: 201 });
}
