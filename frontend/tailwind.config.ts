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
        },
      },
      fontFamily: {
        display: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
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
