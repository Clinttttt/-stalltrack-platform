import { Facility as DemoFacility, RequestRecord } from './demo';
import {
  ActivateMunicipalityCommand,
  ActivationCustomAnimal,
  ActivationFacility,
  NpmMonthBasisStr,
  ActivationOrSeries,
  ActivationRate,
  BillingArchetypeStr,
  FacilityCodeStr,
  FeeRateKeyStr,
} from './activation.api';
import { hasUndeclaredAreas, isCustomArea, MarketSectionKind, marketSectionLabelOf, withDeclaredAreas } from './market-sections';

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

/** The rate key that carries one collection area's own daily fee. Mirrors FacilityRateKeys.PerAreaDailyKey. */
const PER_AREA_RATE_KEY: Record<MarketSectionKind, FeeRateKeyStr> = {
  VegetableArea: 'NpmDailyStallVegetable',
  FishSection: 'NpmDailyStallFish',
  MeatSection: 'NpmDailyStallMeat',
};

const VALID_MARKET_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function num(s: string | undefined | null): number | undefined {
  if (s == null) return undefined;
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function usernameSlug(municipality: string): string {
  return municipality.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'lgu';
}

/**
 * How the office measures what a market month owes, read from its own draft.
 *
 * Anything other than an explicit `PureDays` is the rent goal: that is what every office onboarded before this existed is
 * on, and reading an unknown value as the days basis would re-price a market on the strength of a typo.
 */
function monthBasisOf(f: { monthBasis?: string | null }): NpmMonthBasisStr {
  return f.monthBasis === 'PureDays' ? 'PureDays' : 'RentGoal';
}

function archetypeOf(type: string): BillingArchetypeStr {  switch (type) {
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

/**
 * The Head's username, derived from the LGU's own name (e.g. Carrascal → `carrascal.head`).
 *
 * The operator does NOT choose it. It used to be an input on the activation form, which put one office's sign-in name
 * in another office's hands — the Head's credentials are the Head's. Nothing the office states during onboarding is a
 * username (its config carries a name, a role and an email), so activation derives one from the municipality and the
 * Head changes it in their own portal, where editing your own account is already allowed.
 */
export function headUsernameFor(municipality: string): string {
  return `${usernameSlug(municipality)}.head`;
}

export function mapRequestToCommand(
  r: RequestRecord,
  overrides?: { officeName?: string | null; sealPath?: string | null },
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

    // A daily-stall market carries the LGU's own name for each collection area of its sheet. The LGU declared
    // which area each of its sections is, so its names travel to its portal verbatim.
    const sections = archetype === 'DailyStall' ? withDeclaredAreas(f.sections || []) : [];
    if (archetype === 'DailyStall' && hasUndeclaredAreas(f.sections || [])) {
      warnings.push(
        `"${f.name}" was configured before onboarding asked which collection area each market section is; ` +
          `areas were assumed in the order they were entered (${sections
            .map((s) => `${s.name || 'unnamed'} = ${marketSectionLabelOf(s.kind)}`)
            .join(', ')}). Confirm this before committing.`,
      );
    }

    // The market's OWN areas, beyond the three the platform keys on: a rice section, a dry goods row, a carinderia
    // line. Each travels by name and is registered in the facility's section registry, so the office's stalls can be
    // filed under it from the first day. An area with no name is dropped, because there is nothing to register and
    // nothing to print on a sheet, and the operator is told which row went.
    const customAreas: string[] = [];
    if (archetype === 'DailyStall') {
      const seen = new Set<string>();
      for (const s of sections.filter((x) => isCustomArea(x.kind))) {
        const name = (s.name || '').trim();
        if (!name) {
          warnings.push(`"${f.name}" declared an area of its own without naming it; that row was left out.`);
          continue;
        }
        if (seen.has(name.toLowerCase())) {
          warnings.push(`"${f.name}" declared the area "${name}" more than once; it is registered once.`);
          continue;
        }
        seen.add(name.toLowerCase());
        customAreas.push(name);
      }
    }

    facilities.push({
      code,
      name: f.name.trim(),
      shortName: facilityShortName(f.name, code),
      archetype,
      stallGroups: undefined,
      customSections: customAreas.length ? customAreas : undefined,
      // How the office measures a market month. Sent only for a daily-collected market, because nothing else has one, and
      // omitted where the office said nothing so the API applies the rent goal every existing office is on.
      monthBasis: archetype === 'DailyStall' ? monthBasisOf(f) : undefined,
      sectionLabels:
        archetype === 'DailyStall'
          ? {
              vegetable: sections.find((s) => s.kind === 'VegetableArea')?.name?.trim() || null,
              fish: sections.find((s) => s.kind === 'FishSection')?.name?.trim() || null,
              meat: sections.find((s) => s.kind === 'MeatSection')?.name?.trim() || null,
            }
          : undefined,
    });

    // Fixed ordinance rates.
    if (archetype === 'DailyStall') {
      // The market's own daily rate: the first of the THREE areas the office priced, falling back to any priced row and
      // then to a legacy facility-level amount. It answers for an area the office did not price and for a stall of its
      // own areas that carries no rate, so it is read from a canonical area rather than from a custom one — a rice
      // section priced at 45 is not the market's rate for everybody else.
      const canonicalPriced = sections.filter((s) => !isCustomArea(s.kind) && num(s.rate));
      const marketRate =
        num(canonicalPriced[0]?.rate) ?? num((f.sections || []).find((s) => (s.rate ?? '').trim())?.rate) ?? num(f.rateAmount) ?? 0;
      rates.push({ facilityCode: code, key: 'NpmDailyStall', amount: marketRate });

      // And the rate of each area the office priced, so an office that prices its areas apart is billed area by area.
      // Filed for every priced area including the first: stating it twice costs nothing (the API files one row per key)
      // and it means the office's own figure for an area never depends on which row it happened to enter first.
      //
      // Until 2026-08-23 only the market's rate was filed and the rest were dropped, silently at first and then with a
      // warning. Nothing is dropped now, so the warning is gone; what remains worth saying is when an area was left
      // unpriced and will therefore bill at the market's rate.
      const unpriced: string[] = [];
      for (const s of sections) {
        if (isCustomArea(s.kind)) continue;   // a market's own area is billed at the rate its stalls were let at
        const key = PER_AREA_RATE_KEY[s.kind as MarketSectionKind];
        const amount = num(s.rate);
        if (amount && amount > 0) rates.push({ facilityCode: code, key, amount });
        else unpriced.push(`${s.name || marketSectionLabelOf(s.kind)}`);
      }
      if (unpriced.length && canonicalPriced.length) {
        warnings.push(
          `"${f.name}" states no daily rate for ${unpriced.join(', ')}; those areas will bill at the market's ` +
            `${marketRate}. The office can set an area's own rate in its portal later.`,
        );
      }

      // The MONTHLY rent a space is let for, when the LGU's ordinance states one. The daily rate above is the
      // installment it is collected in; this is what a month owes. Omitted (or 0) leaves it unstated, and a month is
      // then thirty daily rates — which is the reference municipality's own ordinance. Sending it silently dropped
      // was how an LGU could be billed a month it never passed.
      const monthlyRent = num(f.monthlyRent);
      // Not sent where the office measures a month by the DAYS it has: a monthly amount is a figure no month owes on that
      // basis, and the API refuses the pair rather than filing a rate nothing reads. Anything the office typed before it
      // chose that basis is simply left out of the activation instead of contradicting it.
      if (monthlyRent && monthlyRent > 0 && monthBasisOf(f) !== 'PureDays') {
        rates.push({ facilityCode: code, key: 'NpmMonthlyStall', amount: monthlyRent });
      }
      // The per-kilo weighing fee belongs to whichever area the LGU declared as its fish section, whatever it
      // calls that area. Reading the fee's own wording was how an LGU that wrote "Isda" was seeded no fee at all.
      const fishFee = (sections.find((s) => s.kind === 'FishSection')?.fees || [])[0];
      if (fishFee) {
        const perKilo = num(fishFee.amount) ?? 0;
        rates.push({ facilityCode: code, key: 'NpmFishPerKilo', amount: perKilo });
        if (perKilo <= 0) {
          warnings.push(`"${f.name}" states no per-kilo weighing fee for its fish area; it will be seeded at 0.`);
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

  // One rate per facility and key. The platform files a single amount per rate on a single effective date, so two rows
  // under one key cannot both be stored — and until 2026-08-23 the second one reached Postgres, which answered the
  // operator with the single word "Conflict" on an LGU that had never been activated. It happens honestly: the
  // platform holds ONE large-animal rate, so a slaughterhouse listing carabao and cow produces two rows under
  // SlhLargePerHead. Stated at the same amount they are one statement and are sent once. Stated at different amounts
  // they contradict each other, and the operator is told before committing rather than after being refused.
  const deduped: ActivationRate[] = [];
  const seen = new Map<string, ActivationRate>();
  for (const rate of rates) {
    const id = `${rate.facilityCode}|${rate.key}`;
    const first = seen.get(id);
    if (!first) {
      seen.set(id, rate);
      deduped.push(rate);
      continue;
    }
    if (first.amount === rate.amount) {
      warnings.push(
        `${rate.facilityCode} states its ${rate.key} rate more than once at the same amount (${rate.amount}); it is filed once.`,
      );
    } else {
      warnings.push(
        `${rate.facilityCode} states two different amounts for one rate, ${rate.key} (${first.amount} and ${rate.amount}). ` +
          `The platform files one amount per rate, so activation is refused until the office says which its ordinance charges.`,
      );
      // Sent as given. Choosing between an office's two amounts is not the console's decision, and the backend names
      // the contradiction precisely.
      deduped.push(rate);
    }
  }

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
      username: headUsernameFor(r.municipality),
      email: (admin?.email || '').trim(),
    },
    facilities,
    rates: deduped,
    customAnimals: customAnimals.length ? customAnimals : undefined,
    orSeries: parseOrSeries(r.config?.orSeries),
    tpmMarketDay,
  };

  return { command, warnings };
}
