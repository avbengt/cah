import { BlackCard, GameState, Player, WhiteCard } from "./types";

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const HAND_SIZE = 10;

export function dealCards(
  player: Player,
  whiteDeck: WhiteCard[]
): { player: Player; whiteDeck: WhiteCard[] } {
  const needed = HAND_SIZE - player.hand.length;
  const drawn = whiteDeck.slice(0, needed);
  const remaining = whiteDeck.slice(needed);
  return {
    player: { ...player, hand: [...player.hand, ...drawn] },
    whiteDeck: remaining,
  };
}

export function dealToAll(game: GameState): GameState {
  let whiteDeck = game.whiteDeck;
  const players = game.players.map((p) => {
    const result = dealCards(p, whiteDeck);
    whiteDeck = result.whiteDeck;
    return result.player;
  });
  return { ...game, players, whiteDeck };
}

export function nextCzar(game: GameState): string {
  const idx = game.players.findIndex((p) => p.id === game.czarId);
  return game.players[(idx + 1) % game.players.length].id;
}

export function drawBlackCard(
  blackDeck: BlackCard[]
): { card: BlackCard; deck: BlackCard[] } {
  const [card, ...deck] = blackDeck;
  return { card, deck };
}

export function startRound(game: GameState): GameState {
  const { card, deck } = drawBlackCard(game.blackDeck);
  const dealt = dealToAll({ ...game, blackDeck: deck });
  return {
    ...dealt,
    phase: "picking",
    blackCard: card,
    played: [],
    winnerId: null,
    winnerCardText: null,
  };
}

export function allNonCzarsPlayed(game: GameState): boolean {
  const nonCzars = game.players.filter((p) => p.id !== game.czarId && !p.inactive);
  return nonCzars.every((p) =>
    game.played.some((e) => e.playerId === p.id)
  );
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
