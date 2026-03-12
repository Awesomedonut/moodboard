import MoodBoard from "@/components/MoodBoard";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MoodBoard boardId={id} />;
}
