import NoteDetailsClient from "./NoteDetailsClient";

export const instant = false;

export default async function NoteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <NoteDetailsClient id={id} />;
}

