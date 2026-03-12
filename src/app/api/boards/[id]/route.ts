import { NextRequest, NextResponse } from "next/server";
import { readBoards, writeBoards, readItems, deleteMetaBlob, del } from "@/lib/storage";

export const dynamic = "force-dynamic";

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

  const items = await readItems(id);
  for (const item of items) {
    if (item.type === "image") {
      await del(item.url);
    }
  }
  await deleteMetaBlob(`meta/board-${id}.json`);

  const updated = boards.filter((b) => b.id !== id);
  await writeBoards(updated);

  return NextResponse.json({ success: true });
}
