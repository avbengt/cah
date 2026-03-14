import { allNonCzarsPlayed } from "@/lib/game";
import { pusherServer } from "@/lib/pusher";
import { getGame, saveGame } from "@/lib/redis";
import { WhiteCard } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { roomCode, playerId, cards }: { roomCode: string; playerId: string; cards: WhiteCard[] } =
    await req.json();

  const game = await getGame(roomCode);
  if (!game) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (game.phase !== "picking") return NextResponse.json({ error: "Not picking phase" }, { status: 400 });
  if (game.czarId === playerId) return NextResponse.json({ error: "Czar cannot play" }, { status: 400 });
  if (game.played.some((e) => e.playerId === playerId))
    return NextResponse.json({ error: "Already played" }, { status: 400 });

  const player = game.players.find((p) => p.id === playerId);
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const blackCard = game.blackCard!;
  if (cards.length !== blackCard.pick)
    return NextResponse.json({ error: `Must play exactly ${blackCard.pick} card(s)` }, { status: 400 });

  // Remove played cards from hand
  let hand = [...player.hand];
  for (const card of cards) {
    const idx = hand.findIndex((c) => c.text === card.text);
    if (idx === -1) return NextResponse.json({ error: "Card not in hand" }, { status: 400 });
    hand.splice(idx, 1);
  }

  const updatedPlayers = game.players.map((p) =>
    p.id === playerId ? { ...p, hand } : p
  );
  const updatedPlayed = [...game.played, { playerId, cards }];
  const updatedGame = { ...game, players: updatedPlayers, played: updatedPlayed };

  const everyonePlayed = allNonCzarsPlayed(updatedGame);
  const finalGame = everyonePlayed ? { ...updatedGame, phase: "judging" as const } : updatedGame;

  await saveGame(finalGame);

  // Tell the player their updated hand
  await pusherServer.trigger(`private-player-${playerId}`, "hand-updated", {
    hand,
  });

  // Tell everyone how many have played (no card content revealed)
  await pusherServer.trigger(`room-${roomCode}`, "play-submitted", {
    playedCount: finalGame.played.length,
    totalNeeded: game.players.filter((p) => p.id !== game.czarId && !p.inactive).length,
    playerId,
  });

  if (everyonePlayed) {
    // Shuffle played entries so czar can't identify by order
    const shuffledPlayed = [...finalGame.played].sort(() => Math.random() - 0.5);
    await pusherServer.trigger(`room-${roomCode}`, "judging-started", {
      phase: "judging",
      played: shuffledPlayed,
    });
  }

  return NextResponse.json({ ok: true });
}
