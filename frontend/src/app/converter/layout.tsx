import type { Metadata } from "next";
import { routeMetadata } from "@/lib/routeMetadata";

/**
 * Server layout wrapping a client page purely so this route can own its
 * metadata - a "use client" page cannot export it, so every route inherited the
 * root layout's single title and description before this. Renders nothing of
 * its own.
 */
export const metadata: Metadata = routeMetadata("converter");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
