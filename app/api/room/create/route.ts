import { generateRoomCode, shuffle, startRound } from "@/lib/game";
import { getGame, saveGame } from "@/lib/redis";
import { BlackCard, GameState, WhiteCard } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const CARDS_API = "https://www.restagainsthumanity.com/api/graphql";

async function fetchPacks(packNames: string[]) {
  const res = await fetch(CARDS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ packs { name black { text pick } white { text } } }`,
    }),
  });
  const json = await res.json();
  const packs: { name: string; black: { text: string; pick: number }[]; white: { text: string }[] }[] =
    json.data.packs;

  const selected = packs.filter((p) => packNames.includes(p.name));
  const blackCards: BlackCard[] = selected.flatMap((p) =>
    p.black.map((c) => ({ text: c.text, pick: c.pick }))
  );
  const whiteCards: WhiteCard[] = selected.flatMap((p) =>
    p.white.map((c) => ({ text: c.text }))
  );

  return { blackCards, whiteCards };
}

export async function POST(req: NextRequest) {
  const { hostName, selectedPacks, maxScore } = await req.json();

  if (!hostName || !selectedPacks?.length) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { blackCards, whiteCards } = await fetchPacks(selectedPacks);
  if (blackCards.length < 10 || whiteCards.length < 20) {
    return NextResponse.json({ error: "Not enough cards in selected packs" }, { status: 400 });
  }

  let roomCode: string;
  let attempts = 0;
  do {
    roomCode = generateRoomCode();
    attempts++;
    if (attempts > 10) {
      return NextResponse.json({ error: "Could not generate unique room code" }, { status: 500 });
    }
  } while (await getGame(roomCode));

  const hostId = uuidv4();
  const game: GameState = {
    roomCode,
    phase: "lobby",
    players: [
      {
        id: hostId,
        name: hostName,
        score: 0,
        isHost: true,
        hand: [],
      },
    ],
    czarId: hostId,
    blackCard: null,
    blackDeck: shuffle(blackCards),
    whiteDeck: shuffle(whiteCards),
    played: [],
    winnerId: null,
    winnerCardText: null,
    roundNumber: 0,
    maxScore: maxScore ?? 8,
    selectedPacks,
  };

  await saveGame(game);

  return NextResponse.json({ roomCode, playerId: hostId });
}
