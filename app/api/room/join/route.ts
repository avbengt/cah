import { dealCards } from "@/lib/game";
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
  if (game.phase === "ended") {
    return NextResponse.json({ error: "Game has ended" }, { status: 400 });
  }
  const activePlayers = game.players.filter((p) => !p.inactive);
  if (activePlayers.length >= 10) {
    return NextResponse.json({ error: "Room is full" }, { status: 400 });
  }

  const playerId = uuidv4();
  let newPlayer: import("@/lib/types").Player = { id: playerId, name: playerName, score: 0, isHost: false, hand: [] };
  let whiteDeck = game.whiteDeck;

  // Deal a hand immediately if joining mid-game
  if (game.phase !== "lobby") {
    const dealt = dealCards(newPlayer, whiteDeck);
    newPlayer = dealt.player;
    whiteDeck = dealt.whiteDeck;
  }

  const updatedGame = {
    ...game,
    whiteDeck,
    players: [...game.players, newPlayer],
  };

  await saveGame(updatedGame);

  const publicPlayers = updatedGame.players
    .filter((p) => !p.inactive)
    .map((p) => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost }));

  await pusherServer.trigger(`room-${roomCode}`, "player-joined", {
    players: publicPlayers,
  });

  // Send hand to new player via private channel if joining mid-game
  if (game.phase !== "lobby") {
    await pusherServer.trigger(`private-player-${playerId}`, "hand-updated", {
      hand: newPlayer.hand,
    });
  }

  return NextResponse.json({ playerId });
}
