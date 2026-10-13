const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');
const brand = require('../../libs/brand/tailwind-preset');
const platform = require('../../libs/brand/tailwind-platform-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [brand, platform],
  content: [
    join(__dirname, 'src/**/*.{html,ts}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
};
