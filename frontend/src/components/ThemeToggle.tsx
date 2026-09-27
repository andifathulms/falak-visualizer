/**
 * Theme selection (DESIGN.md v2 §1.3): the operating system's preference by
 * default, overridden only when the reader explicitly picks Terang or Gelap.
 *
 * The OS default needs no script at all - globals.css applies the dark
 * tokens under `prefers-color-scheme: dark` unless <html> carries `.light`.
 * An explicit choice is stored and re-applied by this blocking script before
 * first paint (a normal script runs after hydration, late enough to flash
 * the wrong theme). "system" is stored as the absence of a choice.
 *
 * Kept in this file so the control and the script that must agree with it
 * (same storage key, same classes) cannot drift apart.
 */
export const THEME_STORAGE_KEY = "falak-theme";

export type ThemeChoice = "system" | "light" | "dark";

export const noFlashThemeScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var c=document.documentElement.classList;c.remove('light','dark');if(s==='light'||s==='dark')c.add(s);}catch(e){}})();`;

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyThemeChoice(choice: ThemeChoice): void {
  const classes = document.documentElement.classList;
  classes.remove("light", "dark");
  if (choice !== "system") classes.add(choice);
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage can be unavailable (private browsing); the choice still applies
    // for this page view, it just won't persist.
  }
}
