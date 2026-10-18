// StallTrack Platform palette: the one visual language of the public Landing and the Platform Admin console, aligned with the
// Head Portal (--accent #1f5fbf / --accent-hover #194f9f / --accent-soft #eaf1fb). Applied AFTER the shared brand preset, and only by
// the two apps that make up the platform, so the Payor app keeps its own look until it is reviewed on its own.
//
// What changed from the brand preset: there is no dark navy surface. Primary surfaces and actions are the civic blue; text is a
// neutral near-black (`ink`); the canvas and hairlines are neutral grays. `navy` is deliberately NOT defined here as a surface -
// it is remapped to the civic blue, so a stray legacy class can never render the old dark panel.

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1f5fbf', 700: '#194f9f', 600: '#194f9f' },
        // panel / deep: the identity surfaces (hero band, auth brand panel), as in the Head Portal (--civic-panel / --civic-panel-deep).
        civic: { DEFAULT: '#1f5fbf', hover: '#194f9f', soft: '#eaf1fb', ring: '#9fbfe9', line: '#c9dcf5', panel: '#1d4c86', deep: '#163c6b' },
        // A very pale blue for context bands and form panels, so a page or panel is never pure white (--surface-blue-subtle).
        tint: { DEFAULT: '#f3f7fd', line: '#d8e3f2' },
        // Placeholder gray for skeletons.
        skeleton: '#e3e8ef',
        ink: '#17212f',
        mist: '#f4f6f9',
        line: '#dde3ea',
        muted: '#5b6778',
      },
      keyframes: {
        'ui-rise': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'ui-pop': { from: { opacity: '0', transform: 'translateY(-6px)' }, to: { opacity: '1', transform: 'none' } },
        'ui-shimmer': { '0%': { backgroundPosition: '-150% 0' }, '100%': { backgroundPosition: '150% 0' } },
      },
      animation: {
        'ui-rise': 'ui-rise 250ms cubic-bezier(.2,.7,.2,1) both',
        'ui-pop': 'ui-pop 150ms cubic-bezier(.2,.7,.2,1) both',
        'ui-shimmer': 'ui-shimmer 1.25s ease-in-out infinite',
      },
      boxShadow: {
        card: '0 8px 24px rgba(23, 33, 47, 0.07)',
        soft: '0 2px 10px rgba(23, 33, 47, 0.05)',
      },
    },
  },
};
