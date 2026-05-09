import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";
import aspectRatio from "@tailwindcss/aspect-ratio";
import animate from "tailwindcss-animate";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        primary: "#1E40AF",
        "primary-hover": "#1D4ED8",
        accent: "#3B82F6",
        "accent-soft": "#E0F2FE",
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
        surface: "var(--color-surface)",
        "surface-muted": "var(--color-surface-muted)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        card: "var(--color-card)",
        "card-hover": "var(--color-card-hover)",
        heading: "var(--color-heading)",
        body: "var(--color-body)"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
        lift: "0 16px 40px rgba(15, 23, 42, 0.12)"
      },
      animation: {
        "fade-in": "fadeIn 180ms ease-out",
        "slide-up": "slideUp 220ms cubic-bezier(0.22, 1, 0.36, 1)"
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } }
      }
    }
  },
  plugins: [forms, typography, aspectRatio, animate]
};
