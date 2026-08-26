const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');
const brand = require('../../libs/brand/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [brand],
  content: [
    join(__dirname, 'src/**/*.{html,ts}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
};
