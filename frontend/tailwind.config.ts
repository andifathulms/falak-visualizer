import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Semantic tokens. Prefer these over the raw ramps below for anything
        // carrying text: each resolves to a per-mode value in globals.css that
        // was measured at >= 4.5:1 against both that mode's page background and
        // its card surface. The raw `gold`/`moon`/`neutral` ramps are fixed
        // hexes and cannot make that guarantee in both modes at once.
        ink: {
          DEFAULT: "var(--text-body)",
          muted: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--accent-text)",
          solid: "var(--accent-solid)",
          on: "var(--accent-on-solid)",
        },
        verdict: {
          positive: "var(--verdict-positive)",
          negative: "var(--verdict-negative)",
        },

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
      fontFamily: {
        display: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
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
          "linear-gradient(to bottom, transparent, var(--background) 90%)",
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
