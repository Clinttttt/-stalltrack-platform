import type { Municipality, MunicipalityStatus } from './municipality.model';
import registryJson from './municipalities.registry.json';

// The build-time registry snapshot is refreshed by tools/sync-municipalities.mjs from GET /api/municipalities.
// It is the initial/fallback state; MunicipalityService overlays the same endpoint at runtime. This file remains
// the source of presentation assets (image and rolloutStage), which the operational registry does not own.
export type RegistryEntry = { code?: string; name?: string; status?: MunicipalityStatus | string; isActive?: boolean };
const registry = registryJson as Record<string, RegistryEntry>;

// Presentation layer — display assets + portal href + demo rolloutStage (hand-maintained).
const presentation: Municipality[] = [
  {
    code: 'carrascal',
    name: 'Carrascal',
    status: 'Upcoming',
    // No rolloutStage. Carrascal has not started: verified against the database on 2026-08-16, where the
    // AssessmentRequests and OnboardingDrafts tables are EMPTY and it owns no rows in any tenant table.
    // Naming a stage made this page report it as part-way through onboarding - a claim about an LGU's
    // dealings with the office that nothing supports. Without one, the page shows the pipeline with no step
    // marked current, which is what "not started" actually looks like.
    image: '/carcanmadcarlan/backgrounds/carrascal-reference.png',
  },
  {
    code: 'cantilan',
    name: 'Cantilan',
    status: 'Active',
    image: '/carcanmadcarlan/backgrounds/cantilan-reference.png',
    active: true,
  },
  { code: 'madrid', name: 'Madrid', status: 'Upcoming', image: '/carcanmadcarlan/backgrounds/madrid-reference.png' },
  { code: 'carmen', name: 'Carmen', status: 'Upcoming', image: '/carcanmadcarlan/backgrounds/carmen-reference.png' },
  { code: 'lanuza', name: 'Lanuza', status: 'Upcoming', image: '/carcanmadcarlan/backgrounds/lanuza-reference.png' },
];

// Where an active municipality's card sends the user — the portal login, scoped to that LGU via ?lgu=.
const PORTAL_LOGIN_URL = 'https://console.stalltrack.site/login';

function applyRegistry(entry: Municipality, reg: RegistryEntry | undefined): Municipality {
  if (!reg) return entry;
  const isActive = reg.isActive ?? reg.status === 'Active';
  return {
    ...entry,
    name: reg.name || entry.name,
    status: isActive ? 'Active' : 'Upcoming',
    active: isActive,
    // Active LGUs go straight to their scoped portal login. The ?lgu={code} drives the login page's
    // branding AND the API's per-municipality sign-in boundary (only that LGU's users can sign in there).
    // Non-active cards fall through to the rollout page.
    href: isActive ? `${PORTAL_LOGIN_URL}?lgu=${encodeURIComponent(entry.code)}` : undefined,
  };
}

/** Build-time snapshot, used immediately and retained when the live registry cannot be reached. */
export const municipalities: Municipality[] = presentation.map((entry) => applyRegistry(entry, registry[entry.code]));

/**
 * Overlay the public API's current rollout state without discarding presentation-only assets. Missing live rows keep
 * their snapshot state, so a partial or older backend response never blanks the CARCANMADCARLAN selector.
 */
export function mergeLiveMunicipalities(
  fallback: readonly Municipality[],
  liveEntries: readonly RegistryEntry[],
): Municipality[] {
  const liveByCode = new Map<string, RegistryEntry>();
  for (const entry of liveEntries) {
    const code = entry.code?.trim().toLowerCase();
    if (code) liveByCode.set(code, entry);
  }

  return fallback.map((entry) => applyRegistry(entry, liveByCode.get(entry.code)));
}

/** Resolve a municipality by its URL slug (case-insensitive). */
export function getMunicipality(
  source: readonly Municipality[],
  code: string | null | undefined,
): Municipality | undefined {
  if (!code) return undefined;
  const normalized = String(code).trim().toLowerCase();
  return source.find((m) => m.code === normalized);
}
