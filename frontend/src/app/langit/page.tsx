"use client";

import { RedirectStub } from "@/components/RedirectStub";

/** Retired by DESIGN.md v2: forwards every query param unchanged (place, date, view, method all keep their names). */
function resolveSearch(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function Redirect() {
  return <RedirectStub targetPath="/salat/" targetLabel="Salat" buildSearch={resolveSearch} />;
}
