// Shared StallTrack brand tokens — the single source of truth for the platform apps
// (public landing + admin console). Consumed as a Tailwind preset; each app keeps its own `content`.
// Ported verbatim from the React monorepo's @stalltrack/brand so the design is identical.

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0d2137', 700: '#112d47', 600: '#1e3a5f' },
        gold: { DEFAULT: '#c8a84b', light: '#e8cc76' },
        ink: '#0d2137',
        mist: '#f0f4f8',
        line: '#dde4ea',
        muted: '#6a8aa0',
        green: { DEFAULT: '#2d7a5f', bg: '#e6f4ef' },
        amber: { DEFAULT: '#9a6b12', bg: '#fdf3e0' },
        red: { DEFAULT: '#8b3a3a', bg: '#fdf0f0' },
      },
      fontFamily: {
        display: ['"EB Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 30px rgba(13, 33, 55, 0.07)',
        soft: '0 6px 18px rgba(13, 33, 55, 0.05)',
      },
    },
  },
}
