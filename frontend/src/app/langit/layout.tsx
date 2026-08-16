import type { Metadata } from "next";
import { routeMetadata } from "@/lib/routeMetadata";

/**
 * Server layout wrapping a client page purely so this route can own its
 * metadata - see converter/layout.tsx for the full explanation, unchanged
 * here.
 */
export const metadata: Metadata = routeMetadata("langit");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
