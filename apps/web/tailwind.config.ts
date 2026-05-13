import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        royal: {
          bg: "var(--bg-base)",
          surface: "var(--bg-surface)",
          "surface-elevated": "var(--bg-elevated)",
          gold: "var(--gold)",
          "gold-hover": "var(--gold-bright)",
          ivory: "var(--text-primary)",
          muted: "var(--text-secondary)",
          danger: "#F87171",
          "move-tint": "rgba(76, 175, 80, 0.4)",
          "board-light": "var(--royal-board-light)",
          "board-dark": "var(--royal-board-dark)",
          "board-selected": "var(--royal-board-selected)",
          "board-legal": "var(--royal-board-legal)",
          "board-last": "rgba(205, 210, 106, 0.4)",
          "premove": "rgba(255, 140, 0, 0.45)",
          "gold-dim": "var(--gold-dim)",
          "gold-muted": "var(--gold-muted)",
          "gold-bright": "var(--gold-bright)",
          "text-secondary": "var(--text-secondary)",
          "text-muted": "var(--text-muted)",
          "text-disabled": "var(--text-disabled)",
          "border-subtle": "var(--border-subtle)",
          "border-default": "var(--border-default)",
          "border-gold": "var(--border-gold)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "legal-pulse": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.95", transform: "scale(1.06)" },
        },
        "king-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-3px)" },
          "40%": { transform: "translateX(3px)" },
          "60%": { transform: "translateX(-2px)" },
          "80%": { transform: "translateX(2px)" },
        },
        "flash-reject": {
          "0%, 100%": { backgroundColor: "transparent" },
          "30%, 70%": { backgroundColor: "rgba(220, 38, 38, 0.5)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "legal-pulse": "legal-pulse 1.2s ease-in-out infinite",
        "king-shake": "king-shake 0.45s ease-in-out",
        "flash-reject": "flash-reject 0.6s ease-in-out 1",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
