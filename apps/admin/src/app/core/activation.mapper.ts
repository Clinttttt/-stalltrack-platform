import { Facility as DemoFacility, RequestRecord } from './demo';
import {
  ActivateMunicipalityCommand,
  ActivationCustomAnimal,
  ActivationFacility,
  ActivationOrSeries,
  ActivationRate,
  BillingArchetypeStr,
  FacilityCodeStr,
} from './activation.api';

// ─────────────────────────────────────────────────────────────────────────────
// Maps a staged onboarding RequestRecord (the admin console's working config) to the
// backend ActivateMunicipalityCommand. The onboarding config is intentionally free-form
// (facility names + billing types), while the backend commits to a fixed FacilityCode +
// BillingArchetype, so this applies a documented, best-effort mapping and surfaces
// `warnings` for anything ambiguous. The operator reviews before committing, and the
// backend validates atomically — a wrong/incomplete command is rejected, not committed.
// ─────────────────────────────────────────────────────────────────────────────

export interface MappedActivation {
  command: ActivateMunicipalityCommand;
  warnings: string[];
}

const ALL_CODES: FacilityCodeStr[] = ['NPM', 'TCC', 'NCC', 'BBQ', 'ICE', 'SLH', 'TRM', 'TPM'];

const VALID_MARKET_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function num(s: string | undefined | null): number | undefined {
  if (s == null) return undefined;
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function usernameSlug(municipality: string): string {
  return municipality.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'lgu';
}

function archetypeOf(type: string): BillingArchetypeStr {
  switch (type) {
    case 'Daily stall':
      return 'DailyStall';
    case 'Monthly rental':
      return 'MonthlyRental';
    case 'Weekly market':
      return 'WeeklyMarket';
    case 'Per trip':
      return 'PerTrip';
    case 'Per head':
      return 'PerHead';
    default:
      return 'Custom';
  }
}

/** Best-effort facility name/type → fixed FacilityCode. */
function candidateCode(f: DemoFacility): FacilityCodeStr {
  const n = f.name.toLowerCase();
  const t = f.type;
  if (t === 'Per head' || /slaughter/.test(n)) return 'SLH';
  if (t === 'Per trip' || /terminal|transport/.test(n)) return 'TRM';
  if (t === 'Weekly market' || /tabo|weekly/.test(n)) return 'TPM';
  if (/barbecue|bbq|grill/.test(n)) return 'BBQ';
  if (/ice\s*plant|iceplant|\bice\b/.test(n)) return 'ICE';
  if (/new commercial|\bncc\b/.test(n)) return 'NCC';
  if (t === 'Daily stall' || /public market/.test(n)) return 'NPM';
  if (/commercial|tampak|\btcc\b|mall|center|centre/.test(n)) return 'TCC';
  return 'TCC';
}

function parseOrSeries(raw: string | undefined): ActivationOrSeries | undefined {
  const s = (raw || '').trim();
  if (!s) return undefined;
  const m = s.match(/^(.*?)(\d+)\s*$/);
  if (!m) return { prefix: s.slice(0, 30) || null, startNumber: 1, padWidth: 0, enabled: true };
  const prefix = m[1] ? m[1].slice(0, 30) : null;
  const digits = m[2];
  return {
    prefix,
    startNumber: Math.max(1, parseInt(digits, 10) || 1),
    padWidth: Math.min(12, digits.length),
    enabled: true,
  };
}

function deriveAcronym(name: string): string | null {
  // Skip connector words so "Madrid Economic Enterprise Office" → "MEEO".
  const stop = new Set(['of', 'the', 'and', 'for', 'a', 'an', 'de', 'del', 'y']);
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter((w) => w.length > 0 && !stop.has(w.toLowerCase()));
  if (words.length < 2) return null;
  return words.map((w) => w[0].toUpperCase()).join('');
}

function parseOffice(requestingOffice: string): { name: string; acronym: string | null } {
  const office = (requestingOffice || '').trim();
  // Prefer an explicit parenthetical acronym, e.g. "… Office (MEEO)"; otherwise derive it from the initials.
  const explicit = office.match(/\(([^)]+)\)/)?.[1]?.trim() || null;
  const name = office.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || office;
  const acronym = explicit || deriveAcronym(name);
  return { name, acronym };
}

/** Derives a facility's short acronym from its name (e.g. "Madrid Commercial Center" → MCC,
 *  "Carmen Public Market" → CPM). Single-word names take their first 3 letters; empty falls back to code. */
function facilityShortName(name: string, code: FacilityCodeStr): string {
  const stop = new Set(['of', 'the', 'and', 'for', 'a', 'an', 'de', 'del', 'y']);
  const words = (name || '')
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter((w) => w.length > 0 && !stop.has(w.toLowerCase()));
  if (words.length >= 2) return words.map((w) => w[0].toUpperCase()).join('').slice(0, 4);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return code;
}

export function mapRequestToCommand(
  r: RequestRecord,
  overrides?: { officeName?: string | null; sealPath?: string | null; username?: string | null },
): MappedActivation {
  const warnings: string[] = [];
  const facilities: ActivationFacility[] = [];
  const rates: ActivationRate[] = [];
  const customAnimals: ActivationCustomAnimal[] = [];
  const used = new Set<FacilityCodeStr>();

  const demoFacilities = r.config?.facilities ?? [];

  for (const f of demoFacilities) {
    const archetype = archetypeOf(f.type);
    if (archetype === 'Custom') {
      warnings.push(`"${f.name}" has an unrecognized billing type ("${f.type}") — sent as Custom.`);
    }

    // Assign a distinct FacilityCode (backend keys facilities by code per LGU).
    let code = candidateCode(f);
    if (used.has(code)) {
      const free = ALL_CODES.find((c) => !used.has(c));
      if (free) {
        warnings.push(`"${f.name}" collided on code ${code}; assigned ${free} instead.`);
        code = free;
      }
    }
    used.add(code);

    // NOTE: activation provisions only the LGU identity, facilities, fixed rates, and the Head account.
    // Stalls/units (and their occupants/payors), collectors, and additional admins are created later in
    // the live portal — NOT at onboarding — so we never auto-provision stall groups here.

    facilities.push({
      code,
      name: f.name.trim(),
      shortName: facilityShortName(f.name, code),
      archetype,
      stallGroups: undefined,
    });

    // Fixed ordinance rates.
    if (archetype === 'DailyStall') {
      // The daily stall rate now lives on the market sections; use the first section
      // with a base rate set, falling back to any legacy facility-level rateAmount.
      const sectionRate = (f.sections || []).find((s) => (s.rate ?? '').trim())?.rate;
      rates.push({ facilityCode: code, key: 'NpmDailyStall', amount: num(sectionRate) ?? num(f.rateAmount) ?? 0 });
      for (const s of f.sections || []) {
        for (const fee of s.fees || []) {
          if (/kilo|fish/.test(fee.label.toLowerCase())) {
            rates.push({ facilityCode: code, key: 'NpmFishPerKilo', amount: num(fee.amount) ?? 0 });
          }
        }
      }
      for (const a of f.addOns || []) {
        const label = a.label.toLowerCase();
        if (/electri/.test(label)) rates.push({ facilityCode: code, key: 'ElecPerKwh', amount: num(a.amount) ?? 0 });
        else if (/water/.test(label)) rates.push({ facilityCode: code, key: 'WaterPerCubicMeter', amount: num(a.amount) ?? 0 });
      }
    } else if (archetype === 'WeeklyMarket') {
      rates.push({ facilityCode: code, key: 'TpmVendorDay', amount: num(f.rateAmount) ?? 0 });
    } else if (archetype === 'PerTrip') {
      rates.push({ facilityCode: code, key: 'TrmPerTrip', amount: num(f.rateAmount) ?? 0 });
    } else if (archetype === 'PerHead') {
      for (const item of f.rateItems || []) {
        const l = item.label.toLowerCase();
        const amount = num(item.amount) ?? 0;
        if (/hog|pig|swine/.test(l)) rates.push({ facilityCode: code, key: 'SlhHogPerHead', amount });
        else if (/cattle|carabao|cow|large|bull|buffalo|goat/.test(l)) rates.push({ facilityCode: code, key: 'SlhLargePerHead', amount });
        else customAnimals.push({ animalName: item.label.trim(), ratePerHead: amount });
      }
    }
  }

  const users = r.config?.users ?? [];
  const admin = users.find((u) => /admin|super/i.test(u.role)) ?? users[0];
  if (!admin) warnings.push('No administrator account was configured for this LGU.');

  // Both the office name label and the acronym derive from the same workspace
  // "Office name (report header)" input (its parenthetical → acronym); fall back to
  // the requesting office from the original request when the workspace value is absent.
  const office = parseOffice(overrides?.officeName || r.requestingOffice);
  if (!office.acronym) {
    warnings.push('No office acronym found in the office name — the portal will fall back to a default.');
  }

  // Tabo-an (Weekly market) market day — sent as a DayOfWeek string name (backend
  // defaults to Friday when omitted). Only send one of the 7 valid names; anything
  // else (blank/invalid) is dropped so the backend default applies.
  const weeklyMarket = demoFacilities.find((f) => f.type === 'Weekly market');
  const rawMarketDay = (weeklyMarket?.marketDay || '').trim();
  const tpmMarketDay = VALID_MARKET_DAYS.includes(rawMarketDay) ? rawMarketDay : undefined;

  const command: ActivateMunicipalityCommand = {
    municipalityCode: r.municipality.trim(),
    branding: {
      officeName: office.name,
      address: null,
      sealPath: overrides?.sealPath?.trim() || null,
      officeAcronym: office.acronym,
    },
    administrator: {
      fullName: (admin?.name || '').trim(),
      username: overrides?.username?.trim() || `${usernameSlug(r.municipality)}.head`,
      email: (admin?.email || '').trim(),
    },
    facilities,
    rates,
    customAnimals: customAnimals.length ? customAnimals : undefined,
    orSeries: parseOrSeries(r.config?.orSeries),
    tpmMarketDay,
  };

  return { command, warnings };
}
