import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The Platform (public Landing and Platform Admin) has one visual language: the civic blue, neutral text and neutral surfaces of
 * the Head Portal. The old dark-navy surfaces and the gold-on-navy accents are retired, so a view cannot quietly bring them back.
 *
 * This reads the shipped sources, not the rendered pages: it fails the moment a retired class name appears in a template,
 * a component or a stylesheet of either app.
 */
const RETIRED = [
  /\b(?:hover:|focus:|group-hover:|checked:)?(?:bg|text|border|ring|from|to|via|fill|stroke|accent|divide|outline|shadow)-navy(?:-\d+)?\b/,
  /\ba-btn-navy\b|\bbtn-navy\b|\ba-btn-gold\b|\bbtn-gold\b/,
  /\bbg-gold\b|\bborder-gold\b|\bring-gold\b|\bfrom-gold\b/, // gold stays as a small wordmark accent only (text-gold)
  // No brand gradients, glows or glass. A scrim over a photograph is not a brand gradient and is allowed.
  /\bbg-gradient-to-\w+\s+from-(?:civic|navy|gold)\b|\bbackdrop-blur-sm\b|\bblur-3xl\b/,
  /#0d2137|#061b2f|#0b2239|#112d47|#1e3a5f/i, // the old navy, by value
];

function root(): string {
  const candidates = [process.cwd(), join(process.cwd(), '..'), join(process.cwd(), '..', '..')];
  for (const c of candidates) if (existsSync(join(c, 'apps', 'landing', 'src'))) return c;
  throw new Error('Cannot find the workspace root from ' + process.cwd());
}

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(html|ts|css)$/.test(name) && !/\.spec\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe.each(['landing', 'admin'])('platform theme: %s uses no retired navy/gold/gradient treatment', (app) => {
  const files = sources(join(root(), 'apps', app, 'src'));

  it('has sources to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('contains none of the retired class names', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const s = readFileSync(f, 'utf8');
      for (const re of RETIRED) {
        const m = s.match(re);
        if (m) offenders.push(`${f.replace(root(), '')}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('platform theme: the palette that replaces it', () => {
  it('maps the legacy navy name to the civic blue, so a stray class can never render the dark panel', () => {
    const preset = readFileSync(join(root(), 'libs', 'brand', 'tailwind-platform-preset.js'), 'utf8');
    expect(preset).toContain("navy: { DEFAULT: '#1f5fbf'");
    expect(preset).toContain("civic: { DEFAULT: '#1f5fbf', hover: '#194f9f', soft: '#eaf1fb'");
    expect(preset).not.toContain('#0d2137');
  });

  it('is applied by both platform apps and leaves the shared brand preset (used by the Payor app) alone', () => {
    for (const app of ['landing', 'admin']) {
      const cfg = readFileSync(join(root(), 'apps', app, 'tailwind.config.js'), 'utf8');
      expect(cfg).toContain('presets: [brand, platform]');
    }
    const brand = readFileSync(join(root(), 'libs', 'brand', 'tailwind-preset.js'), 'utf8');
    expect(brand).toContain("navy: { DEFAULT: '#0d2137'");
  });
});

describe('platform theme: the shared UI kit', () => {
  const files = sources(join(root(), 'libs', 'ui', 'src'));

  it('has sources to check', () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it('contains none of the retired class names', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const s = readFileSync(f, 'utf8');
      for (const re of RETIRED) {
        const m = s.match(re);
        if (m) offenders.push(`${f.replace(root(), '')}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never renders a native <select>: the house dropdown is the only one', () => {
    const offenders = files.filter((f) => /<select[\s>]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
