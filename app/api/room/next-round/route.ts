import { startRound } from "@/lib/game";
import { pusherServer } from "@/lib/pusher";
import { getGame, saveGame } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { roomCode, playerId } = await req.json();

  const game = await getGame(roomCode);
  if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (game.phase !== "results") return NextResponse.json({ error: "Not in results phase" }, { status: 400 });
  if (!game.players.find((p) => p.id === playerId)) return NextResponse.json({ error: "Player not in room" }, { status: 403 });

  const activePlayers = game.players.filter((p) => !p.inactive);
  const preferredCzar = game.winnerId && activePlayers.find((p) => p.id === game.winnerId)
    ? game.winnerId
    : activePlayers[0]?.id ?? game.czarId;

  const nextGame = startRound({
    ...game,
    czarId: preferredCzar,
    roundNumber: game.roundNumber + 1,
  });
  await saveGame(nextGame);

  for (const p of nextGame.players.filter((p) => !p.inactive)) {
    await pusherServer.trigger(`private-player-${p.id}`, "hand-updated", {
      hand: p.hand,
    });
  }

  await pusherServer.trigger(`room-${roomCode}`, "round-started", {
    phase: nextGame.phase,
    czarId: nextGame.czarId,
    blackCard: nextGame.blackCard,
    roundNumber: nextGame.roundNumber,
    players: nextGame.players.filter((p) => !p.inactive).map((p) => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost })),
  });

  return NextResponse.json({ ok: true });
}
