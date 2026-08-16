"use client";

import { RedirectStub } from "@/components/RedirectStub";
import { buildSearch } from "@/lib/legacyRedirects";

/** Retired (migration step 9): absorbed into /hilal's "Se-Indonesia" sweep. */
function resolveSearch(params: URLSearchParams): string {
  return buildSearch({
    d: params.get("date") ?? undefined,
    sweep: "indonesia",
    method: params.get("method") ?? undefined,
  });
}

export default function VisibilityMapRedirect() {
  return <RedirectStub targetPath="/hilal/" targetLabel="Hilal" buildSearch={resolveSearch} />;
}
