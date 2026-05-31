import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";
import aspectRatio from "@tailwindcss/aspect-ratio";
import animate from "tailwindcss-animate";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        indigo: {
          50:  '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE',
          300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1',
          600: '#4F46E5', 700: '#4338CA', 800: '#3730A3',
          900: '#312E81', 950: '#1E1B4B',
        },
        coral: {
          50:  '#FFF5F5', 100: '#FFE4E6', 200: '#FECDD3',
          300: '#FDA4AF', 400: '#FB7185', 500: '#F97066',
          600: '#EF4444', 700: '#DC2626',
        },
        midnight: '#0F172A',

        // Compatibility aliases for existing dashboard classes.
        brand: {
          DEFAULT: '#4F46E5', 50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE',
          300: '#A5B4FC', 400: '#818CF8', 500: '#4F46E5', 600: '#4338CA',
          700: '#3730A3', 800: '#312E81', 900: '#1E1B4B', 950: '#1E1B4B',
        },
        navy: {
          DEFAULT: '#0F172A', 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0',
          300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B', 600: '#475569',
          700: '#334155', 800: '#1E293B', 900: '#0F172A', 950: '#020617',
        },
        success: { DEFAULT: '#10B981', 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669', 700: '#047857', 900: '#064E3B', 950: '#022C22' },
        warning: { DEFAULT: '#FBBF24', 50: '#FFFBEB', 100: '#FEF3C7', 500: '#FBBF24', 600: '#D97706', 700: '#B45309', 900: '#78350F', 950: '#451A03' },
        danger: { DEFAULT: '#EF4444', 50: '#FFF5F5', 100: '#FFE4E6', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C', 900: '#7F1D1D', 950: '#450A0A' },
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        'surface-hover': 'var(--color-surface-hover)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        border: 'var(--color-border)',
        card: 'var(--color-card)',
        'card-hover': 'var(--color-card-hover)',
        heading: 'var(--color-heading)',
        body: 'var(--color-body)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px', xl: '16px', '2xl': '20px', '3xl': '24px',
      },
      boxShadow: {
        'glow-indigo': '0 0 20px rgba(79,70,229,0.25), 0 0 60px rgba(79,70,229,0.1)',
        'glow-coral':  '0 0 20px rgba(249,112,102,0.25), 0 0 60px rgba(249,112,102,0.1)',
        glow: '0 0 20px rgba(79,70,229,0.25)',
        'glow-lg': '0 0 40px rgba(79,70,229,0.15), 0 0 80px rgba(79,70,229,0.08)',
        xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)',
        lift: '0 16px 40px rgba(15, 23, 42, 0.12)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #F97066 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
      },
      transitionTimingFunction: {
        ui: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      spacing: { 18: '4.5rem', 88: '22rem', 128: '32rem' },
      maxWidth: { '8xl': '88rem' },
    },
    screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
  },
  plugins: [forms, typography, aspectRatio, animate],
};
