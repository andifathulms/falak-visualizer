"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * The blocking script the root layout inlines into <head>, as a string so it
 * can be embedded verbatim via dangerouslySetInnerHTML and run before first
 * paint - a script tag added the normal way runs after React hydrates, which
 * is late enough to flash the wrong theme. Reads the persisted choice first,
 * falls back to the OS preference only when nothing has been chosen yet
 * (DESIGN.md §2.5: "OS preference as the initial value, user's choice
 * persisted").
 *
 * Kept in this file, not layout.tsx, so the toggle button and the script that
 * has to agree with it (same storage key, same class) can't drift apart.
 */
export const THEME_STORAGE_KEY = "falak-theme";

export const noFlashThemeScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

/**
 * TEMPORARY placement (step 1 of MIGRATION.md): mounted directly by
 * app/layout.tsx as a fixed-position control, not inside NavBar. NavBar's
 * redesign (three nav items, no "Analysis" dropdown, context bar underneath)
 * is a later migration step; this exists now only so darkMode: "class" has a
 * working, testable toggle instead of being inert. It should move into the
 * rebuilt NavBar then, not stay fixed-position permanently.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private browsing, quota); the toggle
      // still works for the rest of this session, it just won't persist.
    }
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-card text-ink shadow-sm transition-colors duration-fast hover:text-accent"
    >
      {/* Rendered only once the client class is known, so this never
          disagrees with the class the blocking script already set. */}
      {isDark === null ? null : isDark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
