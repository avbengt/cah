"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePusherChannel } from "@/lib/usePusher";
import { GamePhase, WhiteCard } from "@/lib/types";
import { PackFooter } from "@/components/PackFooter";

const ACCENT = "#534AB7";
const BLACK_BG = "#000000";
const BLACK_TEXT = "#F1EFE8";
const TOPBAR_BG = "#2C2C2A";
const COUNTDOWN_SECS = 20;
const SKIP_UNLOCK_SECS = 5;

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
  const [nextRoundCountdown, setNextRoundCountdown] = useState<number | null>(null);
  const [canSkip, setCanSkip] = useState(false);
  const [skipUnlockCountdown, setSkipUnlockCountdown] = useState<number | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [mySubmittedCards, setMySubmittedCards] = useState<WhiteCard[]>([]);

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

  useEffect(() => {
    if (!playerId) return;
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        "/api/room/leave",
        new Blob([JSON.stringify({ roomCode, playerId })], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [playerId, roomCode]);

  usePusherChannel(roomCode ? `room-${roomCode}` : null, {
    "player-joined": (data: unknown) => {
      const d = data as { players: PlayerInfo[] };
      setGame((g) => g ? { ...g, players: d.players } : g);
    },
    "player-left": (data: unknown) => {
      const d = data as { players: PlayerInfo[]; phase: GamePhase; playedCount?: number };
      setGame((g) => g ? {
        ...g,
        players: d.players,
        phase: d.phase,
        ...(d.playedCount !== undefined ? { playedCount: d.playedCount } : {}),
      } : g);
    },
    "round-started": (data: unknown) => {
      const d = data as { phase: GamePhase; czarId: string; blackCard: { text: string; pick: number }; roundNumber: number; players: PlayerInfo[] };
      setSelected([]);
      setHasPlayed(false);
      setSelectedWinnerId(null);
      setMySubmittedCards([]);
      setGame((g) => g ? { ...g, ...d, played: [], playedCount: 0, winnerId: null, winnerCardText: null } : g);
    },
    "play-submitted": (data: unknown) => {
      const d = data as { playedCount: number; totalNeeded: number; playerId: string };
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
    setMySubmittedCards(selected);
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

  // Countdown when results phase begins
  useEffect(() => {
    if (game?.phase !== "results") {
      setNextRoundCountdown(null);
      setCanSkip(false);
      return;
    }
    setNextRoundCountdown(COUNTDOWN_SECS);
    setCanSkip(false);
    setSkipUnlockCountdown(SKIP_UNLOCK_SECS);
    const skipTimer = setTimeout(() => { setCanSkip(true); setSkipUnlockCountdown(null); }, SKIP_UNLOCK_SECS * 1000);
    const interval = setInterval(() => {
      setNextRoundCountdown((n) => {
        if (n === null || n <= 1) { clearInterval(interval); return 0; }
        return n - 1;
      });
      setSkipUnlockCountdown((n) => (n !== null && n > 1 ? n - 1 : n));
    }, 1000);
    return () => { clearInterval(interval); clearTimeout(skipTimer); };
  }, [game?.phase]);

  // Anyone's client auto-advances at 0; server handles idempotency via phase check
  useEffect(() => {
    if (nextRoundCountdown === 0 && game?.phase === "results") {
      advanceRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextRoundCountdown]);

  async function advanceRound() {
    await fetch("/api/room/next-round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, playerId }),
    });
  }

  async function judgeWinner() {
    if (!selectedWinnerId || submitting) return;
    setSubmitting(true);
    await fetch("/api/room/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, playerId, winnerId: selectedWinnerId }),
    });
    setSubmitting(false);
  }

  function toggleCard(card: WhiteCard) {
    if (!game) return;
    const pick = game.blackCard?.pick ?? 1;
    setSelected((prev) => {
      const exists = prev.findIndex((c) => c.text === card.text);
      if (exists !== -1) return prev.filter((_, i) => i !== exists);
      if (prev.length >= pick) return [...prev.slice(1), card];
      return [...prev, card];
    });
  }

  function formatBlackCard(text: string, cards: WhiteCard[]) {
    if (cards.length === 0) return text.replace(/_+([.,!?;:]?)/g, (_, p) => `<span style="white-space:nowrap"><span class="card-blank"></span>${p}</span>`);
    let result = text;
    for (const card of cards) {
      result = result.replace(/_+([.,!?;:]?)/, (_, p) => `<span style="white-space:nowrap"><strong>${card.text}</strong>${p}</span>`);
    }
    return result.replace(/_+([.,!?;:]?)/g, (_, p) => `<span style="white-space:nowrap"><span class="card-blank"></span>${p}</span>`);
  }

  if (!game || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#1A1A18" }}>
        <p style={{ color: "#888" }}>Loading...</p>
      </div>
    );
  }

  const me = game.players.find((p) => p.id === playerId);
  const isCzar = game.czarId === playerId;
  const isHost = me?.isHost ?? false;
  const nonCzarCount = game.players.filter((p) => p.id !== game.czarId).length;
  const czar = game.players.find((p) => p.id === game.czarId);
  const progressPct = nextRoundCountdown !== null ? (nextRoundCountdown / COUNTDOWN_SECS) * 100 : 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#1A1A18", color: "#D3D1C7" }}>

      {/* TOPBAR */}
      <header
        className="flex items-center justify-between px-6 py-3 shrink-0 border-b gap-4"
        style={{ background: TOPBAR_BG, borderColor: "#3A3A38" }}
      >
        {/* Left: title + room */}
        <div className="flex items-center gap-4 shrink-0">
          <span className="font-bold text-white text-md leading-tight">
            Shmards Against Shmumanity
          </span>
          <span className="font-mono text-md tracking-widest" style={{ color: "#808080" }}>
            {roomCode}
          </span>
        </div>

        <div />

        {/* Right: end game */}
        <div className="flex items-center shrink-0">
          {isHost && game.phase !== "lobby" && game.phase !== "ended" && (
            <button
              onClick={endGame}
              className="text-sm px-2.5 py-1 rounded-sm transition-colors cursor-pointer"
              style={{ color: "#808080", border: "1px solid #9A9A9A" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#808080")}
            >
              End game
            </button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex overflow-hidden">

        {/* Right sidebar: players + next round */}
        <aside
          className="shrink-0 flex flex-col border-l overflow-y-auto order-last"
          style={{ width: 220, borderColor: "#2A2A28", background: "#1A1A18" }}
        >
          <div className="p-4 flex flex-col gap-1 flex-1">
            <p className="text-md font-medium mb-2" style={{ color: "#888" }}>Players</p>
            {[...game.players].sort((a, b) => b.score - a.score).map((p) => {
              const isCzarPlayer = p.id === game.czarId && game.phase !== "lobby" && game.phase !== "ended";
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-sm text-md"
                  style={{
                    background: isCzarPlayer ? "rgb(55, 49, 123)" : "#2A2A28",
                    color: "#D3D1C7",
                    border: isCzarPlayer ? `2px solid ${ACCENT}` : "2px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate font-medium">{p.name}</span>
                    {isCzarPlayer && (
                      <span
                        className="text-sm font-bold px-1.25 py-0.5 rounded-sm shrink-0"
                        style={{ background: ACCENT, color: "#fff" }}
                      >
                        Czar
                      </span>
                    )}
                  </div>
                  <span className="text-sm shrink-0 ml-2" style={{ color: "#888" }}>
                    {p.score}pts
                  </span>
                </div>
              );
            })}
          </div>

        </aside>

        {/* Game content */}
        <div className="flex-1 flex overflow-hidden">

          {/* LOBBY */}
          {game.phase === "lobby" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Waiting for players...</h2>
                <p style={{ color: "#888" }}>
                  Share the room code:{" "}
                  <span className="font-mono text-white text-2xl tracking-widest">{roomCode}</span>
                </p>
              </div>
              {isHost && (
                <button
                  onClick={startGame}
                  disabled={game.players.length < 2}
                  className="bg-white text-black font-bold py-3 px-10 rounded-sm hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {game.players.length < 2 ? "Need at least 2 players" : "Start Game"}
                </button>
              )}
              {!isHost && <p className="text-md" style={{ color: "#888" }}>Waiting for host to start...</p>}
            </div>
          )}

          {/* PICKING / JUDGING: 2-column */}
          {(game.phase === "picking" || game.phase === "judging") && game.blackCard && (
            <div className="flex flex-1 overflow-hidden">

              {/* Left col: black card */}
              <div
                className="shrink-0 p-6 flex flex-col gap-4 border-r overflow-y-auto"
                style={{ width: 260, borderColor: "#2A2A28" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-md font-medium" style={{ color: "#888" }}>Round {game.roundNumber}</span>
                  {isCzar ? (
                    <span
                      className="text-sm font-bold px-2 py-0.5 rounded-sm"
                      style={{ background: ACCENT, color: "#fff" }}
                    >
                      You are czar!
                    </span>
                  ) : (
                    <span className="text-md" style={{ color: "#888" }}>
                      Czar: <span className="font-medium" style={{ color: "#D3D1C7" }}>{czar?.name ?? "—"}</span>
                    </span>
                  )}
                </div>

                <div
                  className="card-font w-full aspect-[2.5/3.5] rounded-[12px] p-4 flex flex-col justify-start"
                  style={{ background: BLACK_BG, color: BLACK_TEXT, border: "1px solid #9A9A9A" }}
                >
                  <p
                    className="text-lg leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatBlackCard(game.blackCard.text, []) }}
                  />
                  {game.blackCard.pick > 1 && (
                    <p className="text-md mt-2" style={{ color: "#888" }}>Pick {game.blackCard.pick}</p>
                  )}
                </div>
              </div>

              {/* Right col: submissions + hand */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 min-w-0">

                {/* Picking: per-player columns (face-up blank = submitted, face-down = pending) */}
                {game.phase === "picking" && (
                  <div>
                    <h3 className="text-md font-medium mb-3" style={{ color: "#D3D1C7" }}>
                      Waiting for players... ({game.playedCount}/{nonCzarCount} submitted)
                    </h3>
                    <div className="flex flex-wrap gap-3 pb-2">
                      {(() => {
                        const pick = game.blackCard?.pick ?? 1;
                        const mySubmission = !isCzar && mySubmittedCards.length > 0 ? mySubmittedCards : null;
                        const otherSubmittedCount = mySubmission ? game.playedCount - 1 : game.playedCount;
                        const pendingCount = nonCzarCount - game.playedCount;
                        return (
                          <>
                            {/* Own submitted cards — face up, grouped in a column */}
                            {mySubmission && (
                              <div className="flex flex-col gap-2 shrink-0">
                                {mySubmission.map((c, i) => (
                                  <div key={`mine-${i}`} className="card-font w-[150px] aspect-[2.5/3.5] bg-white text-black p-4 rounded-[12px] overflow-hidden flex flex-col justify-start">
                                    <span className="text-md line-clamp-6">{c.text}</span>
                                    <PackFooter pack={c.pack} />
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Other submitted slots — anonymous ✓, grouped per player */}
                            {Array.from({ length: otherSubmittedCount }).map((_, i) => (
                              <div key={`submitted-${i}`} className="flex flex-col gap-2 shrink-0">
                                {Array.from({ length: pick }).map((_, j) => (
                                  <div
                                    key={j}
                                    className="card-font w-[150px] aspect-[2.5/3.5] bg-white rounded-[12px] p-4 flex items-center justify-center"
                                    style={{ border: "1px solid #e0e0e0" }}
                                  >
                                    <span className="text-lg" style={{ color: "#ccc" }}>✓</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                            {/* Pending slots — grouped per player */}
                            {Array.from({ length: pendingCount }).map((_, i) => (
                              <div key={`pending-${i}`} className="flex flex-col gap-2 shrink-0">
                                {Array.from({ length: pick }).map((_, j) => (
                                  <div
                                    key={j}
                                    className="w-[150px] aspect-[2.5/3.5] rounded-[12px] flex items-center justify-center"
                                    style={{ background: "#2A2A28", border: "1px dashed #3A3A38" }}
                                  >
                                    <span style={{ color: "#3A3A38", fontSize: 32 }}>?</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Judging: cards revealed, czar picks winner */}
                {game.phase === "judging" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-md font-medium" style={{ color: "#D3D1C7" }}>
                        {isCzar ? "Choose your favorite:" : `Waiting for ${czar?.name ?? "the czar"} to judge...`}
                      </h3>
                      {isCzar && (
                        <button
                          onClick={judgeWinner}
                          disabled={!selectedWinnerId || submitting}
                          className="text-md font-bold py-1.5 px-5 rounded-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: ACCENT, color: "#fff" }}
                        >
                          {submitting ? "Picking..." : "Pick this winner →"}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 pb-2">
                      {game.played.map((entry, i) => (
                        <div
                          key={i}
                          onClick={() => isCzar && setSelectedWinnerId((prev) => prev === entry.playerId ? null : entry.playerId)}
                          className={`flex flex-col gap-1.5 rounded-[12px] transition-all shrink-0 ${selectedWinnerId
                            ? entry.playerId === selectedWinnerId ? "opacity-100" : "opacity-[0.35]"
                            : isCzar ? "opacity-[0.85]" : "opacity-100"
                            }${isCzar ? " hover:opacity-100" : ""}`}
                          style={{
                            cursor: isCzar ? "pointer" : "default",
                          }}
                        >
                          {entry.cards.map((c, j) => (
                            <div
                              key={j}
                              className="card-font relative w-[150px] aspect-[2.5/3.5] bg-white text-black p-4 rounded-[12px] overflow-hidden flex flex-col justify-start"
                            >
                              <p className="text-md line-clamp-6">{c.text}</p>
                              <PackFooter pack={c.pack} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider between submissions and hand */}
                {game.phase === "picking" && <hr style={{ borderColor: "#2A2A28" }} />}

                {/* Hand — non-czar players during picking */}
                {game.phase === "picking" && !isCzar && (
                  <>
                    {!hasPlayed ? (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-md font-medium" style={{ color: "#D3D1C7" }}>
                            Your hand
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="text-md" style={{ color: "#D3D1C7" }}>
                              {selected.length}/{game.blackCard.pick} selected
                            </span>
                            <button
                              onClick={playCards}
                              disabled={selected.length !== game.blackCard.pick || submitting}
                              className="text-md font-bold py-1.5 px-5 rounded-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ background: "#fff", color: "#000" }}
                            >
                              {submitting ? "Submitting..." : "Submit cards"}
                            </button>
                          </div>
                        </div>
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <div className="flex flex-wrap gap-2">
                          {game.hand.map((card, i) => {
                            const isSelected = selected.some((c) => c.text === card.text);
                            const selIdx = selected.findIndex((c) => c.text === card.text);
                            return (
                              <button
                                key={i}
                                onClick={() => toggleCard(card)}
                                className={`card-font relative w-[150px] aspect-[2.5/3.5] bg-white text-black p-4 rounded-[12px] text-left overflow-hidden flex flex-col justify-start transition-all cursor-pointer hover:opacity-100 ${selected.length > 0
                                  ? isSelected ? "opacity-100" : "opacity-[0.35]"
                                  : "opacity-[0.85]"
                                  }`}
                                style={{ border: "4px solid transparent" }}
                              >
                                {game.blackCard!.pick > 1 && isSelected && (
                                  <span
                                    className="absolute top-1 right-1 text-sm w-4 h-4 rounded-full flex items-center justify-center font-bold"
                                    style={{ background: ACCENT, color: "#fff" }}
                                  >
                                    {selIdx + 1}
                                  </span>
                                )}
                                <span className="text-md line-clamp-6">{card.text}</span>
                                <PackFooter pack={card.pack} />
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-md font-medium" style={{ color: "#888" }}>Your hand</h3>
                          <span
                            className="text-sm px-2 py-0.5 rounded-sm"
                            style={{ background: "#2A2A28", color: "#888" }}
                          >
                            Submitted ✓
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 opacity-40">
                          {game.hand.map((card, i) => (
                            <div
                              key={i}
                              className="card-font relative w-[150px] aspect-[2.5/3.5] bg-white text-black p-4 rounded-[12px] overflow-hidden flex flex-col justify-start"
                            >
                              <span className="text-md line-clamp-6">{card.text}</span>
                              <PackFooter pack={card.pack} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Czar hand during picking — greyed out */}
                {game.phase === "picking" && isCzar && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-md font-medium" style={{ color: "#888" }}>Your hand</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 opacity-40">
                      {game.hand.map((card, i) => (
                        <div
                          key={i}
                          className="card-font relative w-[150px] aspect-[2.5/3.5] bg-white text-black p-4 rounded-[12px] overflow-hidden flex flex-col justify-start"
                        >
                          <span className="text-md line-clamp-6">{card.text}</span>
                          <PackFooter pack={card.pack} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* RESULTS: 3-column */}
          {game.phase === "results" && game.blackCard && game.winnerId && (
            <div className="flex flex-1 overflow-hidden">

              {/* Col 1: winner callout (~25%) */}
              <div
                className="p-6 flex flex-col gap-4 overflow-y-auto shrink-0 border-r"
                style={{ width: 260, borderColor: "#2A2A28" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-md font-medium" style={{ color: "#888" }}>Round {game.roundNumber}</span>
                  {isCzar ? (
                    <span className="text-sm font-bold px-2 py-0.5 rounded-sm" style={{ background: ACCENT, color: "#fff" }}>
                      You are czar!
                    </span>
                  ) : (
                    <span className="text-md" style={{ color: "#888" }}>
                      Czar: <span className="font-medium" style={{ color: "#D3D1C7" }}>{czar?.name ?? "—"}</span>
                    </span>
                  )}
                </div>
                <div
                  className="card-font w-full aspect-[2.5/3.5] rounded-[12px] p-4 flex flex-col justify-start"
                  style={{ background: BLACK_BG, color: BLACK_TEXT, border: "1px solid #9A9A9A" }}
                >
                  <p
                    className="text-md leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatBlackCard(game.blackCard.text, []) }}
                  />
                </div>
                <hr style={{ borderColor: "#2A2A28" }} />
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Next round</p>
                    <p className="text-sm mt-0.5" style={{ color: "#666" }}>
                      Next czar:{" "}
                      <span style={{ color: "#D3D1C7" }}>
                        {game.players.find((p) => p.id === game.winnerId)?.name ?? "—"}
                      </span>
                    </p>
                  </div>
                  {isCzar ? (
                    <button
                      onClick={advanceRound}
                      disabled={!canSkip}
                      className="w-full text-md font-bold py-2 rounded-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "#fff", color: "#000" }}
                    >
                      {canSkip ? "Next round →" : `Available in ${skipUnlockCountdown}s...`}
                    </button>
                  ) : (
                    <p className="text-sm" style={{ color: "#666" }}>Waiting for czar to advance...</p>
                  )}
                  <div>
                    <p className="text-sm mb-1.5" style={{ color: "#666" }}>
                      Auto-advancing in {nextRoundCountdown ?? COUNTDOWN_SECS}s
                    </p>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "#2A2A28" }}>
                      <div
                        className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                        style={{ width: `${progressPct}%`, background: ACCENT }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 2: all submissions */}
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 min-w-0">
                <h3 className="text-md font-medium" style={{ color: "#D3D1C7" }}>All submissions</h3>
                <div className="flex flex-wrap gap-3 pb-2 items-start">
                  {game.played.map((entry, i) => {
                    const player = game.players.find((p) => p.id === entry.playerId);
                    const isWinner = entry.playerId === game.winnerId;
                    const BANNER_H = 26;
                    return (
                      <div key={i} className="flex flex-col shrink-0" style={{ gap: 6 }}>
                        {/* Fixed-height banner row — keeps cards aligned across all entries */}
                        <div
                          className="flex items-center justify-center rounded-t-[10px]"
                          style={isWinner ? { height: BANNER_H, background: ACCENT } : { height: BANNER_H }}
                        >
                          {isWinner && (
                            <span className="text-sm font-bold tracking-wide" style={{ color: "#fff" }}>Winner!</span>
                          )}
                        </div>
                        {/* Cards */}
                        <div
                          className={`flex flex-col rounded-b-[10px] ${isWinner ? "gap-1 pt-1 px-[6px] pb-[6px]" : "gap-1.5"}`}
                          style={isWinner ? { background: ACCENT, marginTop: -6 } : {}}
                        >
                          {entry.cards.map((c, j) => (
                            <div
                              key={j}
                              className={`card-font relative w-[150px] aspect-[2.5/3.5] bg-white text-black p-4 overflow-hidden flex flex-col justify-start ${isWinner ? "rounded-[8px]" : "rounded-[12px]"}`}
                            >
                              <p className="text-md line-clamp-6">{c.text}</p>
                              <PackFooter pack={c.pack} />
                            </div>
                          ))}
                        </div>
                        <p
                          className="text-md text-center px-1 font-medium"
                          style={{ color: isWinner ? "#fff" : "#888" }}
                        >
                          {player?.name ?? "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* GAME ENDED */}
          {game.phase === "ended" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
              <div>
                <h2 className="text-4xl font-bold text-white mb-2">
                  {game.players.find((p) => p.id === game.winnerId)?.name} wins!
                </h2>
                <p style={{ color: "#888" }}>The game is over</p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="bg-white text-black font-bold py-3 px-8 rounded-sm hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Play Again
              </button>
            </div>
          )}

        </div>{/* end game content wrapper */}

      </main>
    </div>
  );
}
