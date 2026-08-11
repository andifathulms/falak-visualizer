"use client";

import { MotionConfig } from "framer-motion";

/**
 * Honours the OS "reduce motion" setting for every framer-motion animation in
 * the app.
 *
 * `reducedMotion="user"` makes framer-motion drop transform and layout
 * animations when the user has asked for reduced motion, while still allowing
 * opacity to cross-fade - so content continues to appear rather than snapping
 * in, which is the behaviour the preference actually asks for. It is read from
 * the media query at runtime and updates live if the OS setting changes.
 *
 * This exists as a client component only because layout.tsx is a server
 * component and MotionConfig needs a client boundary. One provider covers all
 * fourteen animated components; the alternative was a useReducedMotion() call
 * in each of them, which would be fourteen chances to forget.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
