"use client";

import { packConfig } from "@/lib/pack-config";
import { PackFooter } from "@/components/PackFooter";

export default function BadgeDevPage() {
  return (
    <div className="min-h-screen p-8 bg-zinc-900">
      <h1 className="text-xl font-bold text-white mb-6">Pack Badge Preview</h1>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {Object.entries(packConfig).map(([packName, config]) => (
          <div
            key={packName}
            className="card-font relative w-full aspect-[2.5/3.5] bg-white text-black p-4 rounded-[12px] overflow-hidden flex flex-col justify-start"
            title={packName}
          >
            <span className="text-sm line-clamp-5 text-zinc-500 italic">
              Sample card text for {config.label}.
            </span>
            <PackFooter pack={packName} />
          </div>
        ))}
      </div>
    </div>
  );
}
