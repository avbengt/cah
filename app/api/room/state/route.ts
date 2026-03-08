import { getGame } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get("roomCode");
  const playerId = req.nextUrl.searchParams.get("playerId");

  if (!roomCode || !playerId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const game = await getGame(roomCode);
  if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const player = game.players.find((p) => p.id === playerId);
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  return NextResponse.json({
    phase: game.phase,
    roomCode: game.roomCode,
    czarId: game.czarId,
    blackCard: game.blackCard,
    roundNumber: game.roundNumber,
    maxScore: game.maxScore,
    winnerId: game.winnerId,
    winnerCardText: game.winnerCardText,
    played: game.phase === "judging" ? game.played : game.played.map((e) => ({ playerId: e.playerId, cards: [] })),
    playedCount: game.played.length,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
    })),
    hand: player.hand,
  });
}
