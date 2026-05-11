import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Passport-native palette
        wkblue: "#1e5f9c",
        wkblueDark: "#1a5f9c",
        wknav: "#1976d2",
        wkOrange: "#e8890a",
        page: "#e6ecf1",
        panel: "#ffffff",
        cardHdr: "#c5d8ea",
        cardHdrText: "#1a3d5f",
        line: "#bfcdd8",
        rowAlt: "#f4f7fb",
        ink: "#2c3e50",
        inkDim: "#6b7c8d",
        risk: {
          red: "#c0392b",
          amber: "#b7770d",
          green: "#1a7a3c",
          blue: "#1a5f9c"
        },
        riskBg: {
          red: "#fdf2f1",
          amber: "#fdf8ed",
          green: "#edf7f1",
          blue: "#eef4fb"
        }
      },
      boxShadow: {
        widget: "0 1px 2px rgba(15, 35, 60, 0.06)"
      },
      fontFamily: {
        body: ["Segoe UI", "Arial", "sans-serif"]
      },
      fontSize: {
        xxs: "10px"
      }
    }
  },
  plugins: []
} satisfies Config;
