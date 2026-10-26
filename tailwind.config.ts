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
          green: "var(--color-brand-primary)",
          greenDark: "var(--color-brand-primary)"
        }
      },
      boxShadow: {
        soft: "var(--shadow-soft)"
      },
      borderRadius: {
        control: "var(--public-radius-control-canonical)",
        product: "var(--public-radius-product)",
        functional: "var(--public-radius-functional)"
      },
      fontSize: {
        ui: ["var(--public-control-text)", { lineHeight: "var(--public-control-leading)" }],
        caption: ["var(--text-caption)", { lineHeight: "var(--leading-caption)" }]
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
