import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        experience: {
          canvas: "var(--color-canvas)",
          ink: "var(--color-ink)",
          secondary: "var(--color-text-secondary)",
          soft: "var(--color-surface-soft)",
          divider: "var(--color-divider-soft)",
          border: "var(--color-border)",
          sale: "var(--color-sale-error)",
          success: "var(--color-success)",
          focus: "var(--color-info-focus)"
        },
        brand: {
          black: "#000000",
          white: "#FFFFFF",
          offWhite: "#F5F5F5",
          charcoal: "#111111",
          softGray: "#E5E5E5",
          muted: "#757575",
          green: "#063D24",
          greenDark: "#063D24"
        }
      },
      boxShadow: {
        soft: "0 18px 60px rgba(17, 17, 17, 0.08)"
      },
      fontFamily: {
        heading: ["var(--font-sans)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"]
      }
    }
  },
  plugins: []
};

export default config;
