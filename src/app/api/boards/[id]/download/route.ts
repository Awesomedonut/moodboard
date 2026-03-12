import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { readItems, readBoards } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
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
  const images = items.filter((item) => item.type === "image");

  if (images.length === 0) {
    return NextResponse.json({ error: "No images to download" }, { status: 400 });
  }

  const zip = new JSZip();

  await Promise.all(
    images.map(async (img, index) => {
      const res = await fetch(img.url);
      const buffer = await res.arrayBuffer();
      const ext = img.url.split(".").pop()?.split("?")[0] || "png";
      const name = img.title || `image-${index + 1}`;
      zip.file(`${name}.${ext}`, buffer);
    })
  );

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const safeName = board.name.replace(/[^a-zA-Z0-9_-]/g, "_");

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
    },
  });
}
