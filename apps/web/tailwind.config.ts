import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-cormorant)", "Georgia", "serif"],
      },
      colors: {
        royal: {
          bg: "#0D0D12",
          surface: "#16161E",
          "surface-elevated": "#1E1E2A",
          gold: "#C9A84C",
          "gold-hover": "#E0BC6A",
          ivory: "#F0EAD6",
          muted: "#8A8A9A",
          danger: "#E05252",
          "move-tint": "rgba(76, 175, 80, 0.4)",
          "board-light": "#F0D9B5",
          "board-dark": "#B58863",
          "board-selected": "rgba(246, 246, 105, 0.5)",
          "board-legal": "rgba(0, 0, 0, 0.2)",
          "board-last": "rgba(205, 210, 106, 0.4)",
          "premove": "rgba(255, 140, 0, 0.45)",
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
