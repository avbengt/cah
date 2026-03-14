import { startRound } from "@/lib/game";
import { pusherServer } from "@/lib/pusher";
import { getGame, saveGame } from "@/lib/redis";
import { Player } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

const publicPlayers = (players: Player[]) =>
  players
    .filter((p) => !p.inactive)
    .map((p) => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost }));

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });
  const { roomCode, playerId } = body;

  const game = await getGame(roomCode);
  if (!game) return NextResponse.json({ ok: true });

  const leavingPlayer = game.players.find((p) => p.id === playerId);
  if (!leavingPlayer || leavingPlayer.inactive) return NextResponse.json({ ok: true });

  // Lobby or ended — hard remove
  if (game.phase === "lobby" || game.phase === "ended") {
    let remaining = game.players.filter((p) => p.id !== playerId);
    if (leavingPlayer.isHost && remaining.length > 0) {
      remaining = remaining.map((p, i) => (i === 0 ? { ...p, isHost: true } : p));
    }
    await saveGame({ ...game, players: remaining });
    await pusherServer.trigger(`room-${roomCode}`, "player-left", {
      players: publicPlayers(remaining),
      phase: game.phase,
    });
    return NextResponse.json({ ok: true });
  }

  // Active game phases — soft delete: mark inactive
  const now = Date.now();
  let players = game.players.map((p) =>
    p.id === playerId ? { ...p, inactive: true, inactiveAt: now } : p
  );

  // Transfer host to first active player if needed
  if (leavingPlayer.isHost) {
    const firstActive = players.find((p) => !p.inactive);
    if (firstActive) {
      players = players.map((p) =>
        p.id === firstActive.id ? { ...p, isHost: true } : p
      );
    }
  }

  const activePlayers = players.filter((p) => !p.inactive);

  // Not enough active players — return to lobby (hard-keep only active)
  if (activePlayers.length < 2) {
    await saveGame({ ...game, players: activePlayers, phase: "lobby", czarId: activePlayers[0]?.id ?? "" });
    await pusherServer.trigger(`room-${roomCode}`, "player-left", {
      players: publicPlayers(activePlayers),
      phase: "lobby",
    });
    return NextResponse.json({ ok: true });
  }

  // Results — soft-delete, fix winnerId if needed
  if (game.phase === "results") {
    const winnerId = game.winnerId === playerId ? (activePlayers[0]?.id ?? null) : game.winnerId;
    await saveGame({ ...game, players, winnerId });
    await pusherServer.trigger(`room-${roomCode}`, "player-left", {
      players: publicPlayers(players),
      phase: game.phase,
    });
    return NextResponse.json({ ok: true });
  }

  const wasCzar = game.czarId === playerId;
  const played = game.played.filter((e) => e.playerId !== playerId);

  // Czar went inactive — assign new czar, start fresh round
  if (wasCzar) {
    const newCzarId = activePlayers[0].id;
    const nextGame = startRound({
      ...game,
      players,
      czarId: newCzarId,
      roundNumber: game.roundNumber + 1,
      played: [],
    });
    await saveGame(nextGame);
    for (const p of nextGame.players.filter((p) => !p.inactive)) {
      await pusherServer.trigger(`private-player-${p.id}`, "hand-updated", { hand: p.hand });
    }
    await pusherServer.trigger(`room-${roomCode}`, "round-started", {
      phase: nextGame.phase,
      czarId: nextGame.czarId,
      blackCard: nextGame.blackCard,
      roundNumber: nextGame.roundNumber,
      players: publicPlayers(nextGame.players),
    });
    return NextResponse.json({ ok: true });
  }

  // Regular player went inactive during picking
  if (game.phase === "picking") {
    const activeNonCzars = activePlayers.filter((p) => p.id !== game.czarId);
    const allPlayed =
      activeNonCzars.length > 0 &&
      activeNonCzars.every((p) => played.some((e) => e.playerId === p.id));

    if (allPlayed) {
      const judging = { ...game, players, played, phase: "judging" as const };
      await saveGame(judging);
      await pusherServer.trigger(`room-${roomCode}`, "judging-started", {
        phase: "judging",
        played: judging.played,
      });
    } else {
      await saveGame({ ...game, players, played });
      await pusherServer.trigger(`room-${roomCode}`, "player-left", {
        players: publicPlayers(players),
        phase: game.phase,
        playedCount: played.length,
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Regular player went inactive during judging
  await saveGame({ ...game, players, played });
  await pusherServer.trigger(`room-${roomCode}`, "player-left", {
    players: publicPlayers(players),
    phase: game.phase,
  });
  return NextResponse.json({ ok: true });
}
