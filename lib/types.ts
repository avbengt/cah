export type GamePhase = "lobby" | "picking" | "judging" | "results" | "ended";

export interface BlackCard {
  text: string;
  pick: number;
}

export interface WhiteCard {
  text: string;
  pack?: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  hand: WhiteCard[];
}

export interface PlayedEntry {
  playerId: string;
  cards: WhiteCard[];
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  czarId: string;
  blackCard: BlackCard | null;
  blackDeck: BlackCard[];
  whiteDeck: WhiteCard[];
  played: PlayedEntry[];
  winnerId: string | null;
  winnerCardText: string | null;
  roundNumber: number;
  maxScore: number;
  selectedPacks: string[];
}
