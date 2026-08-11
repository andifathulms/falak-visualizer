import { ImageResponse } from "next/og";
import { SITE } from "@/lib/routes";

/**
 * The share card, generated at build time.
 *
 * The previous og:image was the 512x512 PWA icon, which forced a small square
 * "summary" card. A 1200x630 image is what unlocks the large-format preview
 * that WhatsApp, Slack and X render - and this app is built around sharing
 * permalinked results, so the preview is part of the product rather than
 * decoration.
 *
 * next/og ships inside Next, so this adds no dependency. It runs during the
 * static export and emits a PNG; nothing renders it at request time.
 *
 * Deliberately typographic rather than a screenshot: a screenshot of a result
 * would show numbers that are not the numbers in the link being shared, which
 * is the kind of plausible-but-wrong detail this project keeps refusing to ship.
 */
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #05070d 0%, #0e1425 60%, #131a2e 100%)",
          color: "#eceef5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, color: "#e8c164", letterSpacing: 2, display: "flex" }}>
          FALAK
        </div>
        <div style={{ fontSize: 68, marginTop: 20, lineHeight: 1.15, display: "flex" }}>
          Hijri dates and prayer times,
        </div>
        <div style={{ fontSize: 68, lineHeight: 1.15, color: "#7dd3c8", display: "flex" }}>
          with the astronomy shown.
        </div>
        <div style={{ fontSize: 30, marginTop: 34, color: "#98a1b5", display: "flex" }}>
          Hisab calculation · Indonesia · every verdict traceable to a rule
        </div>
      </div>
    ),
    size,
  );
}
