import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createBoardItem, put, readItems, writeItemOrder } from "@/lib/storage";
import type { BoardItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const items = await readItems(id);
  return NextResponse.json(items);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { order } = await req.json();
  const items = await readItems(id);

  const itemMap = new Map(items.map((item) => [item.id, item]));
  const reordered = (order as string[])
    .map((itemId: string) => itemMap.get(itemId))
    .filter(Boolean) as BoardItem[];

  await writeItemOrder(id, reordered.map((item) => item.id));
  return NextResponse.json(reordered);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contentType = req.headers.get("content-type") || "";

  let entry: BoardItem;

  if (contentType.includes("application/json")) {
    const { type, url, title, caption } = await req.json();

    entry = {
      id: randomUUID(),
      type,
      url,
      title: title || "",
      caption: caption || "",
      createdAt: new Date().toISOString(),
    };
  } else {
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

    entry = {
      id: imageId,
      type: "image",
      url: blob.url,
      title,
      caption,
      createdAt: new Date().toISOString(),
    };
  }

  await createBoardItem(id, entry);

  return NextResponse.json(entry, { status: 201 });
}
