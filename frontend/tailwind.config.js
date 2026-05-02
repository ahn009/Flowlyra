export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
        surface: "#F6F8FB",
        "surface-muted": "#F1F5F9",
        ink: "#0F172A",
        muted: "#64748B",
        border: "#DBE3EE"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
        lift: "0 16px 40px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};
