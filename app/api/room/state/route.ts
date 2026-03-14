import { getGame, saveGame } from "@/lib/redis";
import { pusherServer } from "@/lib/pusher";
import { Player } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

const publicPlayers = (players: Player[]) =>
  players
    .filter((p) => !p.inactive)
    .map((p) => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost }));

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get("roomCode");
  const playerId = req.nextUrl.searchParams.get("playerId");

  if (!roomCode || !playerId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  let game = await getGame(roomCode);
  if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const player = game.players.find((p) => p.id === playerId);
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Reactivate if they were soft-deleted (page refresh)
  if (player.inactive) {
    game = {
      ...game,
      players: game.players.map((p) =>
        p.id === playerId ? { ...p, inactive: undefined, inactiveAt: undefined } : p
      ),
    };
    await saveGame(game);
    await pusherServer.trigger(`room-${roomCode}`, "player-joined", {
      players: publicPlayers(game.players),
    });
  }

  const currentPlayer = game.players.find((p) => p.id === playerId)!;

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
    players: publicPlayers(game.players),
    hand: currentPlayer.hand,
  });
}
