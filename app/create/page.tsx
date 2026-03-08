"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Pack {
  id: number;
  name: string;
  blackCount: number;
  whiteCount: number;
}

export default function CreatePage() {
  const router = useRouter();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set(["CAH Base Set"]));
  const [hostName, setHostName] = useState("");
  const [maxScore, setMaxScore] = useState(8);
  const [customScore, setCustomScore] = useState("");
  const [loading, setLoading] = useState(false);
  const [packsLoading, setPacksLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/packs")
      .then((r) => r.json())
      .then((d) => { setPacks(d.packs); setPacksLoading(false); });
  }, []);

  function togglePack(name: string) {
    setSelectedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!hostName.trim() || selectedPacks.size === 0) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/room/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostName: hostName.trim(),
        selectedPacks: Array.from(selectedPacks),
        maxScore,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    sessionStorage.setItem("playerId", data.playerId);
    sessionStorage.setItem("playerName", hostName.trim());
    router.push(`/room/${data.roomCode}`);
  }

  return (
    <main className="flex flex-col items-center min-h-screen p-6 py-12">
      <div className="w-full max-w-2xl">
        <button
          onClick={() => router.push("/")}
          className="text-zinc-400 hover:text-white text-sm mb-8 flex items-center gap-2"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold mb-8">Create a Game</h1>

        <form onSubmit={handleCreate} className="space-y-8">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Your name</label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-sm px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Points to win</label>
            <div className="flex items-center gap-3 flex-wrap">
              {[5, 8, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setMaxScore(n); setCustomScore(""); }}
                  className={`px-5 py-2 rounded-sm font-bold transition-colors ${maxScore === n && !customScore
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
                    }`}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={100}
                value={customScore}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomScore(val);
                  const n = parseInt(val);
                  if (!isNaN(n) && n >= 1 && n <= 100) setMaxScore(n);
                }}
                placeholder="Custom"
                className={`w-28 px-3 py-2 rounded-sm font-bold border transition-colors bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none ${customScore ? "border-white" : "border-zinc-700"
                  }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-zinc-400">Card packs</label>
              <div className="flex gap-3 text-sm">
                <button type="button" onClick={() => setSelectedPacks(new Set(packs.map((p) => p.name)))} className="text-zinc-400 hover:text-white">
                  Select all
                </button>
                <button type="button" onClick={() => setSelectedPacks(new Set())} className="text-zinc-400 hover:text-white">
                  Clear
                </button>
              </div>
            </div>

            {packsLoading ? (
              <p className="text-zinc-500 text-sm">Loading packs...</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {packs.map((pack) => (
                  <label
                    key={pack.id}
                    className={`flex items-center justify-between p-3 rounded-sm cursor-pointer transition-colors ${selectedPacks.has(pack.name)
                      ? "bg-zinc-700 border border-zinc-500"
                      : "bg-zinc-800 border border-zinc-700 hover:bg-zinc-750"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedPacks.has(pack.name)}
                        onChange={() => togglePack(pack.name)}
                        className="w-4 h-4 accent-white"
                      />
                      <span className="font-medium text-sm">{pack.name}</span>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {pack.blackCount}B / {pack.whiteCount}W
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-2">{selectedPacks.size} pack{selectedPacks.size !== 1 ? "s" : ""} selected</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !hostName.trim() || selectedPacks.size === 0}
            className="w-full bg-white text-black font-bold py-4 px-6 rounded-sm hover:bg-zinc-200 transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Game"}
          </button>
        </form>
      </div>
    </main>
  );
}
