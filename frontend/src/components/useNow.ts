"use client";

import { useEffect, useState } from "react";
import { nowInstant } from "@/lib/skyNow";
import type { Instant } from "@/lib/falak/time";

/**
 * The current instant, refreshed every `intervalMs` (DESIGN.md v2 §3.4 "living
 * now"). Null until mounted: the static export is prerendered at build time,
 * and a time baked into that HTML would be both wrong and a hydration mismatch.
 */
export function useNow(intervalMs = 30_000): Instant | null {
  const [now, setNow] = useState<Instant | null>(null);
  useEffect(() => {
    setNow(nowInstant());
    const id = window.setInterval(() => setNow(nowInstant()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
