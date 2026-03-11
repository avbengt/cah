import { pusherServer } from "@/lib/pusher";
import { getGame, saveGame } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { roomCode, playerId } = await req.json();

  const game = await getGame(roomCode);
  if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const player = game.players.find((p) => p.id === playerId);
  if (!player?.isHost) return NextResponse.json({ error: "Only the host can end the game" }, { status: 403 });

  if (game.phase === "ended") return NextResponse.json({ ok: true });

  const ended = { ...game, phase: "ended" as const };
  await saveGame(ended);

  const topPlayer = [...game.players].sort((a, b) => b.score - a.score)[0];
  await pusherServer.trigger(`room-${roomCode}`, "game-ended", {
    winnerId: topPlayer.id,
    winnerName: topPlayer.name,
    players: game.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
  });

  return NextResponse.json({ ok: true });
}
