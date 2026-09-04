import { PlayerSessionDetail } from "@/features/player-h5/player-session-detail";

export default async function PlayerSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayerSessionDetail sessionId={id} />;
}
