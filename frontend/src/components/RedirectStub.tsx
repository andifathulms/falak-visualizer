"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

/**
 * The retired-route pattern DESIGN.md §4.1 asks every old path to use,
 * shared across all nine rather than repeated nine times - the same
 * client-redirect-plus-visible-link shape the original
 * /method-divergence already proved out, generalised once there were
 * nine real call sites instead of one.
 *
 * `buildSearch` runs inside a useEffect, not at render time: reading
 * `window.location.search` during the initial render would differ
 * between the static-export prerender (no real URL) and the client's
 * first paint, which is exactly the class of server/client mismatch
 * lib/permalink.ts's own header comment already documents avoiding for
 * every other page in this app - same reasoning as migration step 7's
 * DayArc hydration fix, applied before it became a bug here rather than
 * after.
 *
 * Navigates with `window.location.replace`, not next/navigation's
 * router.replace: ObservationProvider is mounted in the root layout and
 * runs on every route including these, and its own URL-sync effect
 * (writeQueryParams -> history.replaceState) fires in the same
 * post-mount window and stomps a client-side router transition before it
 * finishes - confirmed with Playwright, every stub page landed back on
 * its OLD path with ObservationProvider's default params instead of the
 * translated ones. A real browser navigation isn't a state update
 * another component's effect can race and overwrite.
 *
 * The visible link is not a fallback for slow JavaScript - it is what a
 * reader with JS disabled, or a crawler, gets instead of a blank page.
 * Static hosting has no server-side redirect to offer, which is the
 * whole reason this component exists. It renders with no query params
 * until the effect resolves them, matching the server-rendered default.
 */
export function RedirectStub({
  targetPath,
  targetLabel,
  buildSearch,
}: {
  targetPath: string;
  targetLabel: string;
  buildSearch: (oldParams: URLSearchParams) => string;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const oldParams = new URLSearchParams(window.location.search);
    const resolved = buildSearch(oldParams);
    setSearch(resolved);
    window.location.replace(`${targetPath}${resolved}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">Halaman ini telah dipindahkan.</p>
      <Card className="p-5">
        <p className="text-sm">
          Mengalihkan ke{" "}
          <Link href={`${targetPath}${search}`} className="font-medium text-accent underline underline-offset-2">
            {targetLabel}
          </Link>
          . Lokasi dan tanggal Anda tetap terbawa.
        </p>
      </Card>
    </div>
  );
}
