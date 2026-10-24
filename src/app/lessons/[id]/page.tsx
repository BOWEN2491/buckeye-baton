import { notFound, redirect } from "next/navigation";
import { database } from "@/server/db";

export const dynamic = "force-dynamic";

// Existing bookmarks now lead to the project that owns the historical material.
export default async function HistoricalLessonRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await database();
  const { rows } = await db.query<{ projectId: string }>(
    'SELECT "projectId" FROM lessons WHERE id = $1',
    [id],
  );
  if (!rows[0]) notFound();
  redirect(`/projects/${encodeURIComponent(rows[0].projectId)}`);
}
