"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { GitCompareArrows } from "lucide-react";

/**
 * Retired. Method Divergence and the Hijri Year Archive both took a Hijri year
 * and a location and returned twelve months by three criteria; the archive was
 * always a strict superset (day offsets, a unanimity count) and now carries the
 * per-month agree/differ readout that was this page's only unique output.
 *
 * The route is kept rather than deleted because permalinks to it exist and a
 * static host has no server-side redirect to offer. It forwards on mount and
 * carries the query string through, so a bookmarked ?hijri_year=1447 lands on
 * the same year in the archive.
 *
 * The visible link is not a fallback for slow JavaScript - it is what a reader
 * with JS disabled, or a crawler, gets instead of a blank page. The route's
 * canonical points at the archive so search engines consolidate rather than
 * indexing a redirect.
 */
export default function MethodDivergenceRedirect() {
  const router = useRouter();

  useEffect(() => {
    const query = typeof window === "undefined" ? "" : window.location.search;
    router.replace(`/hijri-archive/${query}`);
  }, [router]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GitCompareArrows}
        title="Method Divergence has moved"
        description="This view is now part of the Hijri Year Archive, which shows the same month-by-month agreement plus how many days apart the criteria land."
      />
      <Card className="p-5">
        <p className="text-sm">
          Taking you to the{" "}
          <Link href="/hijri-archive/" className="font-medium text-accent underline underline-offset-2">
            Hijri Year Archive
          </Link>
          . Your year and location carry over.
        </p>
      </Card>
    </div>
  );
}
