import type { Metadata } from "next";
import { routeMetadata } from "@/lib/routeMetadata";

/**
 * Server layout wrapping a client page purely so this route can own its
 * metadata - see converter/layout.tsx for the full explanation, unchanged
 * here. First of the new-IA routes (DESIGN.md §4.1); its `<html lang>` is
 * still "en" at the document level (MIGRATION.md's note on ContextBar) even
 * though this page's own content is Indonesian.
 */
export const metadata: Metadata = routeMetadata("hilal");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
