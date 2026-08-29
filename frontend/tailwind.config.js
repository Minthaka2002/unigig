/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B0E14",
          soft: "#171B26",
        },
        paper: "#FAFAF8",
        signal: {
          DEFAULT: "#2454FF",
          dim: "#EEF2FF",
          deep: "#173BBF",
        },
        alert: {
          DEFAULT: "#E8384F",
          dim: "#FDEBEE",
          deep: "#B9243A",
        },
        slate: {
          soft: "#6B7280",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,14,20,0.04), 0 8px 24px rgba(11,14,20,0.06)",
      },
      opacity: {
        4: "0.04", 6: "0.06", 8: "0.08", 12: "0.12", 15: "0.15", 18: "0.18",
        22: "0.22", 35: "0.35", 45: "0.45", 55: "0.55", 65: "0.65", 85: "0.85",
      },
    },
  },
  plugins: [],
};
