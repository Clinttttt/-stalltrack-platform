// Build-time snapshot: refresh src/app/core/municipalities.registry.json from the live registry API
// (GET /api/municipalities). Server-side fetch → no CORS. On ANY failure it leaves the committed
// snapshot untouched and exits 0, so the build never fails and the site always has a valid fallback.
// Override the endpoint with REGISTRY_API_URL. (Ported 1:1 from the React landing.)

import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL =
  process.env.REGISTRY_API_URL ||
  'https://stalltrack-api-clint-2026-g9awcrbed5fdakh8.southeastasia-01.azurewebsites.net/api/municipalities';

const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'app',
  'core',
  'municipalities.registry.json'
);

const TIMEOUT_MS = 15000;

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let data;
  try {
    const res = await fetch(API_URL, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`registry responded ${res.status}`);
    data = await res.json();
  } finally {
    clearTimeout(timer);
  }

  if (!Array.isArray(data) || data.length === 0) throw new Error('registry payload was empty or not an array');

  const overlay = {};
  for (const m of data) {
    const code = m && m.code ? String(m.code).trim().toLowerCase() : '';
    if (!code || !m.status) continue;
    overlay[code] = {
      name: typeof m.name === 'string' && m.name.trim() ? m.name : code,
      status: m.status,
      isActive: m.isActive === true,
    };
  }

  if (Object.keys(overlay).length === 0) throw new Error('registry payload had no usable entries');

  await writeFile(OUT_PATH, JSON.stringify(overlay, null, 2) + '\n', 'utf8');
  console.log(`[sync-municipalities] snapshot refreshed with ${Object.keys(overlay).length} municipalities.`);
}

main().catch((err) => {
  console.warn(
    `[sync-municipalities] could not refresh from registry (${err.message}). Keeping the committed snapshot as fallback.`
  );
  process.exit(0);
});
