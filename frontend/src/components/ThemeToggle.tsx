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
