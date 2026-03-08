import { Redis } from "@upstash/redis";
import { GameState } from "./types";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ROOM_TTL = 60 * 60 * 4; // 4 hours

export async function getGame(roomCode: string): Promise<GameState | null> {
  const data = await redis.get<GameState>(`room:${roomCode}`);
  return data ?? null;
}

export async function saveGame(game: GameState): Promise<void> {
  await redis.set(`room:${game.roomCode}`, game, { ex: ROOM_TTL });
}

export async function deleteGame(roomCode: string): Promise<void> {
  await redis.del(`room:${roomCode}`);
}
