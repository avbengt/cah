import { NextResponse } from "next/server";

const CARDS_API = "https://www.restagainsthumanity.com/api/graphql";

export async function GET() {
  const res = await fetch(CARDS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ packs { id name black { text } white { text } } }`,
    }),
    next: { revalidate: 3600 },
  });

  const json = await res.json();
  const packs = json.data.packs.map((p: { id: number; name: string; black: unknown[]; white: unknown[] }) => ({
    id: p.id,
    name: p.name,
    blackCount: p.black.length,
    whiteCount: p.white.length,
  }));

  return NextResponse.json({ packs });
}
