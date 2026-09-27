// Shareable/permalink URL helpers. Deliberately uses window.location/history
// directly instead of next/navigation's useSearchParams - these pages are
// statically prerendered, and useSearchParams would force a Suspense
// boundary; reading/writing the query string only on the client (post-mount)
// avoids that without changing how the pages render.

export function readQueryParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/**
 * MERGES into the current query string: keys given with a value are set, keys
 * given as undefined or "" are removed, keys not mentioned are left alone. Two
 * writers share the URL - ObservationProvider (place, date) and the page
 * (its own view state) - and a replace-everything write from either would
 * silently erase the other's part of a permalink.
 */
export function writeQueryParams(params: Record<string, string | number | undefined>) {
  if (typeof window === "undefined") return;
  const qs = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") qs.delete(key);
    else qs.set(key, String(value));
  }
  const query = qs.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", url);
}
