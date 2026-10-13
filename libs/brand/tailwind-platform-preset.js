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
        civic: { DEFAULT: '#1f5fbf', hover: '#194f9f', soft: '#eaf1fb', ring: '#9fbfe9', line: '#c9dcf5' },
        ink: '#17212f',
        mist: '#f4f6f9',
        line: '#dde3ea',
        muted: '#5b6778',
      },
      boxShadow: {
        card: '0 8px 24px rgba(23, 33, 47, 0.07)',
        soft: '0 2px 10px rgba(23, 33, 47, 0.05)',
      },
    },
  },
};
