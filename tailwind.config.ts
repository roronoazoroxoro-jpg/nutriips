import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0d1f18",
          900: "#16352b",
          800: "#1f4d3d",
          700: "#2d6150",
          600: "#4a7a6a",
          500: "#6f9587",
        },
        leaf: {
          50: "#f3faf6",
          100: "#e3f5ea",
          200: "#c6ead5",
          300: "#96d6b3",
          400: "#5cbb8c",
          500: "#34a172",
          600: "#1f8a62",
          700: "#157453",
          800: "#125c43",
        },
        sand: {
          50: "#faf8f4",
          100: "#f3efe6",
        },
      },
      fontFamily: {
        sans: ['"Segoe UI Variable Text"', '"Segoe UI"', "system-ui", "-apple-system", "Roboto", "sans-serif"],
        display: ['"Segoe UI Variable Display"', '"Segoe UI"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(13,31,24,0.04), 0 4px 16px -4px rgba(13,31,24,0.06)",
        lift: "0 12px 32px -8px rgba(13,31,24,0.18)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
        "scale-in": { from: { opacity: "0", transform: "scale(0.97)" }, to: { opacity: "1", transform: "none" } },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(1.5deg)" },
        },
        "float-delayed": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(-2deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "scale-in": "scale-in 160ms ease-out",
        "float-slow": "float 7s ease-in-out infinite",
        "float-delayed": "float-delayed 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
