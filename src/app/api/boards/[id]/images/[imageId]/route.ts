import { NextRequest, NextResponse } from "next/server";
import { readItems, writeItems, del } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
  const { caption } = await req.json();
  const items = await readItems(id);
  const entry = items.find((item) => item.id === imageId);

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  entry.caption = caption ?? entry.caption;
  await writeItems(id, items);

  return NextResponse.json(entry);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
  const items = await readItems(id);
  const entry = items.find((item) => item.id === imageId);

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (entry.type === "image") {
    await del(entry.url);
  }

  const updated = items.filter((item) => item.id !== imageId);
  await writeItems(id, updated);

  return NextResponse.json({ success: true });
}
