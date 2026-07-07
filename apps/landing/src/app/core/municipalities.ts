import { Municipality, MunicipalityStatus } from './municipality.model';
import registryJson from './municipalities.registry.json';

// Live status/name comes from the build-time registry snapshot (refreshed by
// tools/sync-municipalities.mjs from GET /api/municipalities); this file remains the fallback and the
// source of the presentation assets (image, portal href, demo rolloutStage). Mirrors the React wiring.
type RegistryEntry = { name?: string; status?: MunicipalityStatus; isActive?: boolean };
const registry = registryJson as Record<string, RegistryEntry>;

// Presentation layer — display assets + portal href + demo rolloutStage (hand-maintained).
const presentation: Municipality[] = [
  {
    code: 'carrascal',
    name: 'Carrascal',
    status: 'Upcoming',
    rolloutStage: 'onboarding',
    image: '/carcanmadcarlan/backgrounds/carrascal-reference.png',
  },
  {
    code: 'cantilan',
    name: 'Cantilan',
    status: 'Active',
    image: '/carcanmadcarlan/backgrounds/cantilan-reference.png',
    active: true,
    href: 'https://console.stalltrack.site/login',
  },
  { code: 'madrid', name: 'Madrid', status: 'Upcoming', image: '/carcanmadcarlan/backgrounds/madrid-reference.png' },
  { code: 'carmen', name: 'Carmen', status: 'Upcoming', image: '/carcanmadcarlan/backgrounds/carmen-reference.png', href: 'https://console.stalltrack.site/login' },
  { code: 'lanuza', name: 'Lanuza', status: 'Upcoming', image: '/carcanmadcarlan/backgrounds/lanuza-reference.png' },
];

function applyRegistry(entry: Municipality): Municipality {
  const reg = registry[entry.code];
  if (!reg?.status) return entry;
  const isActive = reg.status === 'Active';
  return {
    ...entry,
    name: reg.name || entry.name,
    status: reg.status,
    active: isActive,
    // Route to the portal only while Active; otherwise the card links to the rollout page.
    href: isActive ? entry.href : undefined,
  };
}

export const municipalities: Municipality[] = presentation.map(applyRegistry);

/** Resolve a municipality by its URL slug (case-insensitive). */
export function getMunicipality(code: string | null | undefined): Municipality | undefined {
  if (!code) return undefined;
  const normalized = String(code).trim().toLowerCase();
  return municipalities.find((m) => m.code === normalized);
}
