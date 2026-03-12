import { NextRequest, NextResponse } from "next/server";
import { readBoards, writeBoards, readImages, deleteMetaBlob, del } from "@/lib/storage";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const boards = await readBoards();
  const board = boards.find((b) => b.id === id);

  if (!board) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const images = await readImages(id);
  for (const img of images) {
    await del(img.url);
  }
  await deleteMetaBlob(`meta/board-${id}.json`);

  const updated = boards.filter((b) => b.id !== id);
  await writeBoards(updated);

  return NextResponse.json({ success: true });
}
