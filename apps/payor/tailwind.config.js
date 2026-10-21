const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');
const brand = require('../../libs/brand/tailwind-preset');
// The Platform palette, as Landing and the Platform Admin use it, so the payor's screens read as the same product.
const platform = require('../../libs/brand/tailwind-platform-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [brand, platform],
  content: [
    join(__dirname, 'src/**/*.{html,ts}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
};
