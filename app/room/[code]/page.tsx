"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePusherChannel } from "@/lib/usePusher";
import { GamePhase, WhiteCard } from "@/lib/types";
import { PackFooter } from "@/components/PackFooter";

interface PlayerInfo {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

interface PlayedEntry {
  playerId: string;
  cards: WhiteCard[];
}

interface GameView {
  phase: GamePhase;
  roomCode: string;
  czarId: string;
  blackCard: { text: string; pick: number } | null;
  roundNumber: number;
  maxScore: number;
  winnerId: string | null;
  winnerCardText: string | null;
  played: PlayedEntry[];
  playedCount: number;
  players: PlayerInfo[];
  hand: WhiteCard[];
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string).toUpperCase();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [selected, setSelected] = useState<WhiteCard[]>([]);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchState = useCallback(async (pid: string) => {
    const res = await fetch(`/api/room/state?roomCode=${roomCode}&playerId=${pid}`);
    if (!res.ok) { router.push("/"); return; }
    const data: GameView = await res.json();
    setGame(data);
    setHasPlayed(data.played.some((e) => e.playerId === pid));
  }, [roomCode, router]);

  useEffect(() => {
    const pid = sessionStorage.getItem("playerId");
    if (!pid) { router.push("/"); return; }
    setPlayerId(pid);
    fetchState(pid);
  }, [fetchState, router]);

  // Room-wide channel
  usePusherChannel(roomCode ? `room-${roomCode}` : null, {
    "player-joined": (data: unknown) => {
      const d = data as { players: PlayerInfo[] };
      setGame((g) => g ? { ...g, players: d.players } : g);
    },
    "round-started": (data: unknown) => {
      const d = data as { phase: GamePhase; czarId: string; blackCard: { text: string; pick: number }; roundNumber: number; players: PlayerInfo[] };
      setSelected([]);
      setHasPlayed(false);
      setGame((g) => g ? { ...g, ...d, played: [], playedCount: 0, winnerId: null, winnerCardText: null } : g);
    },
    "play-submitted": (data: unknown) => {
      const d = data as { playedCount: number; totalNeeded: number };
      setGame((g) => g ? { ...g, playedCount: d.playedCount } : g);
    },
    "judging-started": (data: unknown) => {
      const d = data as { phase: GamePhase; played: PlayedEntry[] };
      setGame((g) => g ? { ...g, phase: d.phase, played: d.played } : g);
    },
    "round-results": (data: unknown) => {
      const d = data as { winnerId: string; winnerName: string; winnerCardText: string; players: PlayerInfo[] };
      setGame((g) => g ? { ...g, phase: "results", winnerId: d.winnerId, winnerCardText: d.winnerCardText, players: d.players } : g);
    },
    "game-ended": (data: unknown) => {
      const d = data as { winnerId: string; winnerName: string; players: PlayerInfo[] };
      setGame((g) => g ? { ...g, phase: "ended", winnerId: d.winnerId, players: d.players } : g);
    },
  });

  // Private player channel for hand updates
  usePusherChannel(playerId ? `private-player-${playerId}` : null, {
    "game-started": (data: unknown) => {
      const d = data as { hand: WhiteCard[] };
      setGame((g) => g ? { ...g, hand: d.hand } : g);
    },
    "hand-updated": (data: unknown) => {
      const d = data as { hand: WhiteCard[] };
      setSelected([]);
      setGame((g) => g ? { ...g, hand: d.hand } : g);
    },
  });

  async function startGame() {
    await fetch("/api/room/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, playerId }),
    });
  }

  async function playCards() {
    if (!game || submitting) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/room/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, playerId, cards: selected }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSubmitting(false); return; }
    setHasPlayed(true);
    setSubmitting(false);
  }

  async function endGame() {
    await fetch("/api/room/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, playerId }),
    });
  }

  async function judgeWinner(winnerId: string) {
    setSubmitting(true);
    await fetch("/api/room/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, playerId, winnerId }),
    });
    setSubmitting(false);
  }

  function toggleCard(card: WhiteCard) {
    if (!game) return;
    const pick = game.blackCard?.pick ?? 1;
    setSelected((prev) => {
      const exists = prev.findIndex((c) => c.text === card.text);
      if (exists !== -1) return prev.filter((_, i) => i !== exists);
      if (prev.length >= pick) return prev;
      return [...prev, card];
    });
  }

  function formatBlackCard(text: string, cards: WhiteCard[]) {
    const blankHtml = '<span class="card-blank"></span>';
    if (cards.length === 0) {
      return text.replace(/_+/g, blankHtml);
    }
    let result = text;
    for (const card of cards) {
      result = result.replace(/_+/, `<strong>${card.text}</strong>`);
    }
    /* Replace any remaining blanks (e.g. pick 1 but card has 2 blanks) */
    return result.replace(/_+/g, blankHtml);
  }

  if (!game || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  const me = game.players.find((p) => p.id === playerId);
  const isCzar = game.czarId === playerId;
  const isHost = me?.isHost ?? false;
  const nonCzarCount = game.players.filter((p) => p.id !== game.czarId).length;
  const czar = game.players.find((p) => p.id === game.czarId);

  return (
    <div className="min-h-screen flex">
      {/* Left sidebar: players */}
      <aside className="w-50 shrink-0 bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col gap-4">
        <div>
          <p className="font-bold text-white text-xl leading-none mb-6">Shmards<br />Against<br />Shmumanity</p>
          <p className="font-bold text-white text-sm">Room</p>
          <p className="font-mono text-white tracking-widest text-lg">{roomCode}</p>
        </div>
        {game.phase !== "lobby" && (
          <div>
            <p className="text-zinc-400 text-xs">Round {game.roundNumber}</p>
          </div>
        )}
        <div className="flex-1">
          <p className="text-zinc-400 text-xs font-medium mb-2">Players</p>
          <div className="space-y-1">
            {game.players.map((p) => (
              <div
                key={p.id}
                className={`text-sm py-1.5 px-2 rounded-sm truncate ${p.id === playerId ? "bg-white text-black font-bold" : "bg-zinc-800 text-zinc-300"} ${p.id === game.czarId && game.phase !== "lobby" ? "ring-2 ring-yellow-400" : ""}`}
                title={p.id === game.czarId ? "Card Czar" : p.isHost ? "Host" : undefined}
              >
                {p.name}{p.isHost && " ★"} · {p.score}
              </div>
            ))}
          </div>
        </div>
        {isHost && game.phase !== "lobby" && game.phase !== "ended" && (
          <button
            onClick={endGame}
            className="w-full text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-900 py-2 px-2 rounded-sm transition-colors text-left"
          >
            End game
          </button>
        )}
      </aside>

      {/* Main content: game */}
      <main className="flex-1 min-w-0 p-6 flex flex-col">

        {/* LOBBY */}
        {game.phase === "lobby" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Waiting for players...</h2>
              <p className="text-zinc-400">Share the room code: <span className="font-mono text-white text-2xl tracking-widest">{roomCode}</span></p>
            </div>
            {isHost && (
              <button
                onClick={startGame}
                disabled={game.players.length < 2}
                className="bg-white text-black font-bold py-3 px-10 rounded-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {game.players.length < 2 ? "Need at least 2 players" : "Start Game"}
              </button>
            )}
            {!isHost && <p className="text-zinc-400 text-sm">Waiting for host to start...</p>}
          </div>
        )}

        {/* PICKING / JUDGING / RESULTS */}
        {(game.phase === "picking" || game.phase === "judging" || game.phase === "results") && game.blackCard && (
          <div className="space-y-6">
            <div className="mt-6 space-y-2">
              <p className="text-zinc-400 text-sm">
                Card Czar: <span className="text-white font-bold">{czar?.name ?? "—"}</span>
              </p>

              {/* Black card */}
              <div className="card-font w-[200px] aspect-[2.5/3.5] bg-black border border-zinc-700 rounded-[12px] p-4 flex flex-col justify-start">
                <p className="text-white text-lg leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatBlackCard(game.blackCard.text, []) }}
                />
                {game.blackCard.pick > 1 && (
                  <p className="text-zinc-400 text-sm mt-2">Pick {game.blackCard.pick}</p>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="text-sm text-zinc-400">
              {game.phase === "picking" && (
                isCzar
                  ? `Waiting for players... (${game.playedCount}/${nonCzarCount} played)`
                  : hasPlayed
                    ? `Waiting for others... (${game.playedCount}/${nonCzarCount} played)`
                    : `Choose ${game.blackCard.pick} card${game.blackCard.pick > 1 ? "s" : ""}`
              )}
              {game.phase === "judging" && (isCzar ? "Pick the winner!" : "Waiting for the Czar to judge...")}
              {game.phase === "results" && (() => {
                const winner = game.players.find((p) => p.id === game.winnerId);
                return `${winner?.name} wins this round! Next round starting soon...`;
              })()}
            </div>

            {/* Czar badge */}
            {isCzar && (
              <div className="inline-block bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-sm">
                You are the Card Czar
              </div>
            )}

            {/* Judging: show played cards */}
            {game.phase === "judging" && (
              <div className="space-y-3">
                <h3 className="text-sm text-zinc-400 font-medium">Played cards</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] justify-items-start gap-x-1 gap-y-3">
                  {game.played.map((entry, i) => (
                    <button
                      key={i}
                      onClick={() => isCzar && !submitting && judgeWinner(entry.playerId)}
                      disabled={!isCzar || submitting}
                      className={`card-font relative w-full max-w-[150px] aspect-[2.5/3.5] bg-white text-black p-4 rounded-[12px] text-left transition-all overflow-hidden flex flex-col justify-start ${isCzar ? "cursor-pointer" : "cursor-default"
                        }`}
                    >
                      {entry.cards.map((c, j) => (
                        <p key={j} className="text-sm">{c.text}</p>
                      ))}
                      <PackFooter pack={entry.cards[0]?.pack} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results: highlight winner */}
            {game.phase === "results" && game.winnerId && (
              <div className="card-font w-full max-w-[200px] aspect-[2.5/3.5] bg-zinc-800 border border-yellow-400 rounded-[12px] p-4 flex flex-col justify-start">
                <p className="text-yellow-400 text-sm mb-2">
                  {game.players.find((p) => p.id === game.winnerId)?.name} wins with:
                </p>
                <p className="text-white text-lg"
                  dangerouslySetInnerHTML={{
                    __html: formatBlackCard(
                      game.blackCard.text,
                      game.played.find((e) => e.playerId === game.winnerId)?.cards ?? []
                    )
                  }}
                />
              </div>
            )}

            {/* Hand (non-czar, picking phase) */}
            {!isCzar && game.phase === "picking" && !hasPlayed && (
              <div className="space-y-3">
                <h3 className="text-sm text-zinc-400 font-medium">Your hand</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] justify-items-start gap-x-1 gap-y-3">
                  {game.hand.map((card, i) => {
                    const isSelected = selected.some((c) => c.text === card.text);
                    const selIdx = selected.findIndex((c) => c.text === card.text);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleCard(card)}
                        className={`card-font relative w-full max-w-[150px] aspect-[2.5/3.5] bg-white text-black p-4 rounded-[12px] text-left text-sm transition-all overflow-hidden flex flex-col justify-start ${isSelected ? "ring-2 ring-yellow-400 opacity-100" : "opacity-90 hover:opacity-100"
                          }`}
                      >
                        {game.blackCard!.pick > 1 && isSelected && (
                          <span className="absolute top-1 right-1 bg-yellow-400 text-black text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                            {selIdx + 1}
                          </span>
                        )}
                        <span className="line-clamp-6">{card.text}</span>
                        <PackFooter pack={card.pack} />
                      </button>
                    );
                  })}
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  onClick={playCards}
                  disabled={selected.length !== game.blackCard.pick || submitting}
                  className="bg-white text-black font-bold py-3 px-8 rounded-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : `Play ${selected.length}/${game.blackCard.pick} card${game.blackCard.pick > 1 ? "s" : ""}`}
                </button>
              </div>
            )}

            {/* Hand (non-czar, after played) */}
            {!isCzar && game.phase === "picking" && hasPlayed && (
              <div className="space-y-3">
                <h3 className="text-sm text-zinc-400 font-medium">Your hand</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] justify-items-start gap-x-1 gap-y-3">
                  {game.hand.map((card, i) => (
                    <div
                      key={i}
                      className="card-font relative w-full max-w-[150px] aspect-[2.5/3.5] bg-white text-black p-4 rounded-[12px] text-sm opacity-60 overflow-hidden flex flex-col justify-start"
                    >
                      <span className="line-clamp-6">{card.text}</span>
                      <PackFooter pack={card.pack} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GAME ENDED */}
        {game.phase === "ended" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center">
            <div>
              <h2 className="text-4xl font-bold mb-2">
                {game.players.find((p) => p.id === game.winnerId)?.name} wins!
              </h2>
              <p className="text-zinc-400">The game is over</p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-white text-black font-bold py-3 px-8 rounded-sm hover:bg-zinc-200 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
