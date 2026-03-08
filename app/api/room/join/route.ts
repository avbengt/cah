import { pusherServer } from "@/lib/pusher";
import { getGame, saveGame } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const { roomCode, playerName } = await req.json();

  if (!roomCode || !playerName) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const game = await getGame(roomCode.toUpperCase());
  if (!game) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (game.phase !== "lobby") {
    return NextResponse.json({ error: "Game already in progress" }, { status: 400 });
  }
  if (game.players.length >= 10) {
    return NextResponse.json({ error: "Room is full" }, { status: 400 });
  }

  const playerId = uuidv4();
  const updatedGame = {
    ...game,
    players: [
      ...game.players,
      { id: playerId, name: playerName, score: 0, isHost: false, hand: [] },
    ],
  };

  await saveGame(updatedGame);
  await pusherServer.trigger(`room-${roomCode}`, "player-joined", {
    players: updatedGame.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
    })),
  });

  return NextResponse.json({ playerId });
}
