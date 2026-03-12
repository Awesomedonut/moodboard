import { NextRequest, NextResponse } from "next/server";
import { deleteBoardItemMeta, readItems, updateBoardItem, del } from "@/lib/storage";

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
  await updateBoardItem(id, entry);

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

  await deleteBoardItemMeta(id, imageId);

  return NextResponse.json({ success: true });
}
