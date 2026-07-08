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

function parseOffice(requestingOffice: string): { name: string; acronym: string | null } {
  const office = (requestingOffice || '').trim();
  const acronym = office.match(/\(([^)]+)\)/)?.[1]?.trim() || null;
  const name = office.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  return { name: name || office, acronym };
}

export function mapRequestToCommand(
  r: RequestRecord,
  overrides?: { officeName?: string | null },
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
      shortName: code,
      archetype,
      stallGroups: undefined,
    });

    // Fixed ordinance rates.
    if (archetype === 'DailyStall') {
      rates.push({ facilityCode: code, key: 'NpmDailyStall', amount: num(f.rateAmount) ?? 0 });
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

  const office = parseOffice(r.requestingOffice);
  if (!office.acronym) {
    warnings.push('No office acronym found in the requesting office — the portal will fall back to a default.');
  }

  const command: ActivateMunicipalityCommand = {
    municipalityCode: r.municipality.trim(),
    branding: {
      officeName: overrides?.officeName?.trim() || office.name,
      address: null,
      sealPath: null,
      officeAcronym: office.acronym,
    },
    administrator: {
      fullName: (admin?.name || '').trim(),
      username: `${usernameSlug(r.municipality)}.head`,
      email: (admin?.email || '').trim(),
    },
    facilities,
    rates,
    customAnimals: customAnimals.length ? customAnimals : undefined,
    orSeries: parseOrSeries(r.config?.orSeries),
  };

  return { command, warnings };
}
