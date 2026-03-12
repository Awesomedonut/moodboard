import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readImages, writeImages, put, ImageEntry } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const images = await readImages(id);
  return NextResponse.json(images);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { order } = await req.json();
  const images = await readImages(id);

  const imageMap = new Map(images.map((img) => [img.id, img]));
  const reordered = (order as string[])
    .map((imgId: string) => imageMap.get(imgId))
    .filter(Boolean) as ImageEntry[];

  await writeImages(id, reordered);
  return NextResponse.json(reordered);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "";
  const caption = (formData.get("caption") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const imageId = randomUUID();
  const ext = file.name.split(".").pop() || "png";
  const blob = await put(`images/${imageId}.${ext}`, file, {
    access: "public",
    addRandomSuffix: false,
  });

  const entry: ImageEntry = {
    id: imageId,
    url: blob.url,
    title,
    caption,
    createdAt: new Date().toISOString(),
  };

  const images = await readImages(id);
  images.push(entry);
  await writeImages(id, images);

  return NextResponse.json(entry, { status: 201 });
}
