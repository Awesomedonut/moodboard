import { NextRequest, NextResponse } from "next/server";
import { readImages, writeImages, del } from "@/lib/storage";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
  const images = await readImages(id);
  const entry = images.find((img) => img.id === imageId);

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await del(entry.url);

  const updated = images.filter((img) => img.id !== imageId);
  await writeImages(id, updated);

  return NextResponse.json({ success: true });
}
