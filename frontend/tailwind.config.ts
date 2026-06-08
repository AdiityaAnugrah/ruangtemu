import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // === BRAND PALETTE (coral/warm) ===
        brand: {
          50:  "#fef8f4",
          100: "#fcd3bc",  // #fcd3bc — very light peach
          200: "#f8bca0",
          300: "#e8a891",  // #e8a891 — light coral
          400: "#dc8a6f",  // #dc8a6f — medium coral
          500: "#f18561",  // #f18561 — primary coral (MAIN)
          600: "#d96b47",
          700: "#be5535",
          800: "#9e4429",
          900: "#7c341e",
        },
        // === TEAL PALETTE (deep forest) ===
        teal: {
          50:  "#eef4f3",
          100: "#cfe0de",
          200: "#a0c1be",
          300: "#71a29d",
          400: "#42827c",
          500: "#204744",  // #204744 — primary teal (MAIN)
          600: "#1a3b39",
          700: "#142f2c",
          800: "#0e2220",
          900: "#081615",
        },
        // === CREAM / WARM NEUTRAL ===
        cream: {
          50:  "#fffdf9",
          100: "#fdf3e9",  // #fdf3e9 — main background
          200: "#f9e8d3",
          300: "#f3d5b8",
          400: "#e8c09a",
        },
        // === BROWN / WARM TEXT ===
        brown: {
          300: "#c4a88a",
          400: "#b39176",
          500: "#997e65",  // #997e65 — body text
          600: "#7d6750",
          700: "#614f3c",
          800: "#453829",
          900: "#2a2118",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": "0.625rem",
      },
      boxShadow: {
        "warm-sm": "0 1px 3px rgba(153,126,101,0.12), 0 1px 2px rgba(153,126,101,0.08)",
        "warm":    "0 4px 16px rgba(153,126,101,0.15), 0 2px 6px rgba(153,126,101,0.10)",
        "warm-lg": "0 8px 32px rgba(153,126,101,0.18), 0 4px 12px rgba(153,126,101,0.12)",
        "teal-glow": "0 4px 20px rgba(32,71,68,0.25)",
        "coral-glow": "0 4px 20px rgba(241,133,97,0.35)",
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
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }: any) {
      addUtilities({
        ".scrollbar-none": { "-ms-overflow-style": "none", "scrollbar-width": "none", "&::-webkit-scrollbar": { display: "none" } },
        ".h-safe-bottom": { height: "env(safe-area-inset-bottom, 0px)" },
        ".pb-safe": { paddingBottom: "env(safe-area-inset-bottom, 0px)" },
        ".text-2xs": { fontSize: "0.65rem", lineHeight: "1rem" },
      });
    },
  ],
};

export default config;
