"use client";

import { useEffect, useRef } from "react";
import { pusherClient } from "./pusher";
import type { Channel } from "pusher-js";

export function usePusherChannel(
  channelName: string | null,
  events: Record<string, (data: unknown) => void>
) {
  const channelRef = useRef<Channel | null>(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    if (!channelName) return;

    const channel = pusherClient.subscribe(channelName);
    channelRef.current = channel;

    for (const event of Object.keys(eventsRef.current)) {
      channel.bind(event, (data: unknown) => eventsRef.current[event]?.(data));
    }

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [channelName]);
}
