import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
