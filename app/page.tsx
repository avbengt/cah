"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"home" | "join">("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/room/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: roomCode.toUpperCase(), playerName: name.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    sessionStorage.setItem("playerId", data.playerId);
    sessionStorage.setItem("playerName", name.trim());
    router.push(`/room/${roomCode.toUpperCase()}`);
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="inline-block bg-white text-black font-bold text-3xl px-6 py-4 rounded-sm shadow-lg mb-3">
            Cards Against<br />Humanity
          </div>
          <p className="text-zinc-400 text-sm">A party game for horrible people</p>
        </div>

        {mode === "home" && (
          <div className="space-y-4">
            <button
              onClick={() => router.push("/create")}
              className="w-full bg-white text-black font-bold py-4 px-6 rounded-sm hover:bg-zinc-200 transition-colors text-lg"
            >
              Create Game
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full bg-zinc-800 text-white font-bold py-4 px-6 rounded-sm hover:bg-zinc-700 transition-colors text-lg border border-zinc-700"
            >
              Join Game
            </button>
          </div>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-sm px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Room code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="XXXXX"
                maxLength={5}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-sm px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono tracking-widest text-center text-xl"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim() || !roomCode.trim()}
              className="w-full bg-white text-black font-bold py-4 px-6 rounded-sm hover:bg-zinc-200 transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join Game"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("home"); setError(""); }}
              className="w-full text-zinc-400 hover:text-white text-sm py-2"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
