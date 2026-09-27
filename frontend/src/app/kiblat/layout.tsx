import type { Metadata } from "next";
import { routeMetadata } from "@/lib/routeMetadata";

/** Server layout so this client-rendered route can own its metadata (see routeMetadata.ts). */
export const metadata: Metadata = routeMetadata("kiblat");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
