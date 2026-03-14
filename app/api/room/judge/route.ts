import { pusherServer } from "@/lib/pusher";
import { getGame, saveGame } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { roomCode, playerId, winnerId } = await req.json();

  const game = await getGame(roomCode);
  if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (game.phase !== "judging") return NextResponse.json({ error: "Not judging phase" }, { status: 400 });
  if (game.czarId !== playerId) return NextResponse.json({ error: "Only the czar can judge" }, { status: 403 });

  const winner = game.players.find((p) => p.id === winnerId);
  if (!winner) return NextResponse.json({ error: "Winner not found" }, { status: 404 });

  const winningEntry = game.played.find((e) => e.playerId === winnerId);
  const winnerCardText = winningEntry?.cards.map((c) => c.text).join(" / ") ?? "";

  const updatedPlayers = game.players.map((p) =>
    p.id === winnerId ? { ...p, score: p.score + 1 } : p
  );

  const gameWinner = updatedPlayers.find((p) => p.score >= game.maxScore);

  if (gameWinner) {
    const ended = {
      ...game,
      players: updatedPlayers,
      phase: "ended" as const,
      winnerId,
      winnerCardText,
    };
    await saveGame(ended);
    await pusherServer.trigger(`room-${roomCode}`, "game-ended", {
      winnerId,
      winnerName: gameWinner.name,
      players: updatedPlayers.filter((p) => !p.inactive).map((p) => ({ id: p.id, name: p.name, score: p.score })),
    });
    return NextResponse.json({ ok: true });
  }

  // Round over — show results briefly before next round
  const afterJudge = {
    ...game,
    players: updatedPlayers,
    phase: "results" as const,
    winnerId,
    winnerCardText,
  };
  await saveGame(afterJudge);

  await pusherServer.trigger(`room-${roomCode}`, "round-results", {
    winnerId,
    winnerName: winner.name,
    winnerCardText,
    players: updatedPlayers.filter((p) => !p.inactive).map((p) => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost })),
  });

  return NextResponse.json({ ok: true });
}
