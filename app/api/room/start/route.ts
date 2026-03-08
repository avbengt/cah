import { startRound } from "@/lib/game";
import { pusherServer } from "@/lib/pusher";
import { getGame, saveGame } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { roomCode, playerId } = await req.json();

  const game = await getGame(roomCode);
  if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const player = game.players.find((p) => p.id === playerId);
  if (!player?.isHost) return NextResponse.json({ error: "Only the host can start" }, { status: 403 });
  if (game.phase !== "lobby") return NextResponse.json({ error: "Game already started" }, { status: 400 });
  if (game.players.length < 2) return NextResponse.json({ error: "Need at least 2 players" }, { status: 400 });

  const started = startRound({ ...game, roundNumber: 1 });
  await saveGame(started);

  // Send each player only their own hand
  for (const p of started.players) {
    await pusherServer.trigger(`private-player-${p.id}`, "game-started", {
      hand: p.hand,
    });
  }

  await pusherServer.trigger(`room-${roomCode}`, "round-started", {
    phase: started.phase,
    czarId: started.czarId,
    blackCard: started.blackCard,
    roundNumber: started.roundNumber,
    players: started.players.map((p) => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost })),
  });

  return NextResponse.json({ ok: true });
}
