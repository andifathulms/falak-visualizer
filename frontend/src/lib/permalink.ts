// Shareable/permalink URL helpers. Deliberately uses window.location/history
// directly instead of next/navigation's useSearchParams - these pages are
// statically prerendered, and useSearchParams would force a Suspense
// boundary; reading/writing the query string only on the client (post-mount)
// avoids that without changing how the pages render.

export function readQueryParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function writeQueryParams(params: Record<string, string | number | undefined>) {
  if (typeof window === "undefined") return;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const query = qs.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", url);
}
