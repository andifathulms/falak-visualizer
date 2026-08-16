"use client";

import { useEffect, useState } from "react";

/**
 * DESIGN.md §3.3: "On first load of any page, the sky settles... Total
 * 900ms, once per session." HorizonInstrument's `animateEntrance` prop
 * exists for exactly this ("the CALLER decides when that is... e.g. only
 * on the first page that mounts an instrument each session", see its own
 * doc comment) - this hook is that decision, shared so it's the SAME
 * decision regardless of which page happens to load first in a session
 * (a permalink can land a visitor on /hilal before they ever see /, and
 * the orchestrated moment belongs to whichever of them is first, not to
 * home specifically).
 *
 * sessionStorage, not a module-level variable: a plain in-memory flag
 * would reset on every full page navigation in the static export (each
 * route is its own HTML document), which is exactly the "once per
 * session" boundary sessionStorage is for and a module variable isn't.
 */
const KEY = "falak-instrument-animated";

export function useFirstEntranceAnimation(): boolean {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
      setShouldAnimate(true);
    } catch {
      // sessionStorage unavailable (private browsing, quota) - the page
      // still renders correctly, it just always uses the plain entrance.
    }
  }, []);

  return shouldAnimate;
}
