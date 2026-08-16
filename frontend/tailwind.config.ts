import type { Config } from "tailwindcss";

/**
 * Makes a `var(--token)` colour support Tailwind's opacity-modifier syntax
 * (`bg-accent-solid/10`).
 *
 * Found by rendering an actual page (migration step 5's Se-Indonesia sweep
 * rendered solid black instead of a translucent tint): Tailwind v3 can only
 * synthesize an opacity variant from a colour it can decompose into
 * channels - a literal hex, or a `rgb(var(--x) / <alpha-value>)` triple. A
 * plain `"var(--token)"` string is opaque to it, so every `/NN` modifier
 * against one of these tokens was silently generating no CSS rule at all,
 * across every step of this migration so far (Badge, ErrorBanner,
 * HisabDisclaimer, ContextBar, ThemeToggle, and this file's own `bg-black/5`-
 * style Tailwind-native usages were unaffected - only modifiers against the
 * *custom* tokens defined below failed). Confirmed directly against the
 * compiled CSS output, not assumed: `.bg-accent-solid{...}` existed,
 * `.bg-accent-solid\/10{...}` did not.
 *
 * Tailwind does support a FUNCTION as a colour's theme value, receiving
 * `opacityValue` when a modifier is present. Wiring that through
 * `color-mix()` - already used by `.glass-card` in globals.css, so not a
 * new browser-support bar for this project - fixes every existing and
 * future `/NN` usage at the source, without changing how the underlying
 * CSS custom properties are stored (they stay plain, valid hex strings,
 * which every direct `var(--token)` reference elsewhere - inline SVG
 * fills/strokes in HorizonInstrument.tsx and others - still depends on).
 */
// Tailwind's bundled types don't cover function-valued theme colours even
// though the runtime (tailwindcss/src/util/withAlphaVariable and every core
// colour Tailwind ships) supports them - the `as unknown as string` below is
// working around a type-definition gap, not a real string.
function withOpacity(cssVar: string): string {
  const fn = ({ opacityValue }: { opacityValue?: string }): string =>
    opacityValue === undefined
      ? `var(${cssVar})`
      : `color-mix(in srgb, var(${cssVar}) calc(${opacityValue} * 100%), transparent)`;
  return fn as unknown as string;
}

const config: Config = {
  // DESIGN.md §2.5 / §9.1: a persisted, user-controlled toggle rather than
  // OS-preference-only. The .dark class is set on <html> by a blocking
  // inline script in the root layout (before paint, to avoid a flash) and by
  // the ThemeToggle component thereafter.
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic/role tokens (DESIGN.md §3.1). Every one resolves to a
        // per-mode value in globals.css that was measured at >= 4.5:1 (text)
        // or >= 3:1 (UI strokes) against both --surface-page and
        // --surface-card - see the contrast table in MIGRATION.md. Prefer
        // these over the raw `senja`/`ufuk`/`kertas`/`tinta`/`nila` ramps
        // (added directly to globals.css, not yet exposed here) for anything
        // carrying meaning: the ramps are fixed hexes and cannot make that
        // guarantee in both modes at once.
        surface: {
          page: withOpacity("--surface-page"),
          card: withOpacity("--surface-card"),
        },
        border: withOpacity("--border"),
        ink: {
          DEFAULT: withOpacity("--text-body"),
          muted: withOpacity("--text-muted"),
        },
        accent: {
          DEFAULT: withOpacity("--accent-text"),
          solid: withOpacity("--accent-solid"),
          on: withOpacity("--accent-on-solid"),
        },
        verdict: {
          lit: withOpacity("--verdict-lit"),
          dark: withOpacity("--verdict-dark"),
          margin: withOpacity("--verdict-margin"),
        },

        // --- Superseded ramps -----------------------------------------------
        // Not yet deleted: migration order (MIGRATION.md, DESIGN.md §9.10)
        // removes these only once every component that references them has
        // been restyled onto the tokens above. Do not add new usages.
        night: {
          950: "#05070d",
          900: "#0a0e1a",
          850: "#0e1425",
          800: "#131a2e",
          700: "#1b2440",
          600: "#293353",
          500: "#3c4970",
        },
        gold: {
          300: "#f2d68a",
          400: "#e8c164",
          500: "#d9a83e",
          600: "#b9862a",
        },
        moon: {
          400: "#7dd3c8",
          500: "#4fb3a6",
          600: "#2f8f83",
          // Added for the visibility map's light mode: moon-600 against a slate
          // lattice measures dE 12.8 for normal vision, below the 15 floor where
          // full-colour readers can still tell two marks apart. This step clears
          // it at 21.1.
          700: "#1f7a6e",
        },
        // Map layers. `land` is context the data sits on, never a data colour;
        // `lattice` marks a computed grid location whose criterion was not met,
        // and is deliberately recessive - the verdict it carries is conveyed by
        // the legend, its shape, and its hover tooltip, not by its colour.
        land: {
          light: "#e8eaf0",
          "light-context": "#eef0f4",
          "light-coast": "#cbd2e0",
          dark: "#1b2440",
          "dark-context": "#131a2e",
          "dark-coast": "#293353",
        },
        lattice: {
          light: "#9aa4b8",
          dark: "#6b7899",
        },
      },
      // DESIGN.md §3.2. `sans` and `mono` override Tailwind's own default
      // keys (not just add new ones): Preflight's `html { font-family:
      // theme('fontFamily.sans') }` and every `font-mono` utility both read
      // these, so overriding the defaults - rather than only adding
      // `display` as before - is what makes Be Vietnam Pro the app's actual
      // body font and narrows `font-mono` to Plex Mono instead of the
      // browser's ui-monospace stack. `display` is Newsreader, a serif book
      // face, so its own fallback stack is serif, not sans.
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      // The single type ladder from globals.css. Overriding (not extending)
      // Tailwind's defaults is deliberate: leaving `text-sm` at its stock 14px
      // would let any component silently drop under the 16px body floor just by
      // using the class it always used. Here `text-sm` IS the floor.
      fontSize: {
        "2xs": ["var(--text-2xs)", { lineHeight: "1.4" }],
        xs: ["var(--text-xs)", { lineHeight: "1.45" }],
        sm: ["var(--text-sm)", { lineHeight: "var(--leading-normal)" }],
        base: ["var(--text-sm)", { lineHeight: "var(--leading-normal)" }],
        md: ["var(--text-md)", { lineHeight: "var(--leading-snug)" }],
        lg: ["var(--text-lg)", { lineHeight: "var(--leading-snug)" }],
        xl: ["var(--text-xl)", { lineHeight: "var(--leading-tight)" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "var(--leading-tight)" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "var(--leading-tight)" }],
      },

      // Wired to the motion tokens so `duration-base` etc. collapse to 1ms under
      // prefers-reduced-motion without any component knowing about the
      // preference. Tailwind's numeric duration utilities (duration-200) are
      // left in place and still hardcode their value - these are the ones to
      // reach for in new code.
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },

      spacing: {
        s1: "var(--space-1)",
        s2: "var(--space-2)",
        s3: "var(--space-3)",
        s4: "var(--space-4)",
        s5: "var(--space-5)",
        s6: "var(--space-6)",
        s7: "var(--space-7)",
        s8: "var(--space-8)",
        s9: "var(--space-9)",
        s10: "var(--space-10)",
      },
      backgroundImage: {
        "night-sky":
          "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(217,168,62,0.15), transparent), radial-gradient(ellipse 60% 50% at 90% 10%, rgba(79,179,166,0.12), transparent)",
        "grid-fade":
          "linear-gradient(to bottom, transparent, var(--surface-page) 90%)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        shimmer: "shimmer 2s linear infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
