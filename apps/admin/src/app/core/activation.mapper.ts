import { Facility as DemoFacility, RequestRecord } from './demo';
import {
  ActivateMunicipalityCommand,
  ActivationCustomAnimal,
  ActivationFacility,
  NpmMonthBasisStr,
  ActivationOrSeries,
  ActivationRate,
  BillingArchetypeStr,
  CustomFacilityCodeStr,
  FacilityCodeStr,
  FeeRateKeyStr,
} from './activation.api';
import { hasUndeclaredAreas, isCustomArea, MarketSectionKind, marketSectionLabelOf, withDeclaredAreas } from './market-sections';
import { DeclaredOperationRow, declaredRows } from './onboarding-operations';

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
  blockingErrors: string[];
  /**
   * The revenue operations the office declared. Review information only: none of it is part of the command, so declaring an
   * operation neither blocks activation nor enables anything. Each is set up in the Head Portal afterwards.
   */
  declaredOperations: DeclaredOperationRow[];
}

/** The rate key that carries one collection area's own daily fee. Mirrors FacilityRateKeys.PerAreaDailyKey. */
const PER_AREA_RATE_KEY: Record<MarketSectionKind, FeeRateKeyStr> = {
  VegetableArea: 'NpmDailyStallVegetable',
  FishSection: 'NpmDailyStallFish',
  MeatSection: 'NpmDailyStallMeat',
};

const VALID_MARKET_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function num(s: string | undefined | null): number | undefined {
  if (s == null) return undefined;
  const n = parseFloat(String(s).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

type LegacyAnimalKind = 'Hog' | 'Carabao' | 'Cow' | 'Custom' | 'Review';

/** Compatibility only for drafts saved before slaughterhouse identity was explicit. */
function classifyLegacyAnimal(label: string): LegacyAnimalKind {
  const words = new Set(label.toLowerCase().match(/[a-z]+/g) ?? []);
  const hog = ['hog', 'pig', 'swine'].some((x) => words.has(x));
  const carabao = ['carabao', 'buffalo'].some((x) => words.has(x));
  const cow = words.has('cow');
  const ambiguousLarge = ['large', 'cattle', 'bull'].some((x) => words.has(x));
  const matches = Number(hog) + Number(carabao) + Number(cow);
  if (!label.trim() || matches > 1 || ambiguousLarge) return 'Review';
  if (hog) return 'Hog';
  if (carabao) return 'Carabao';
  if (cow) return 'Cow';
  return 'Custom';
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

/**
 * The facility types the onboarding workspace offers, and the canonical code each one IS. This is the explicit identity a
 * draft carries (`catalogKey`); it is read verbatim and never inferred from the office's own facility name.
 *
 * `other` is deliberately absent: an office's own facility is not any canonical facility. It takes a reserved custom slot.
 */
const CATALOG_CODE: Readonly<Record<string, FacilityCodeStr>> = {
  public_market: 'NPM',
  commercial: 'TCC',
  barbecue: 'BBQ',
  iceplant: 'ICE',
  slaughterhouse: 'SLH',
  terminal: 'TRM',
  weekly: 'TPM',
};

const CUSTOM_CODES: readonly CustomFacilityCodeStr[] = ['Custom1', 'Custom2', 'Custom3', 'Custom4', 'Custom5'];

/** How each canonical code bills. A facility whose declared type contradicts its identity is refused, not re-coded. */
const ARCHETYPE_OF_CODE: Readonly<Record<string, BillingArchetypeStr>> = {
  NPM: 'DailyStall',
  TCC: 'MonthlyRental',
  NCC: 'MonthlyRental',
  BBQ: 'MonthlyRental',
  ICE: 'MonthlyRental',
  SLH: 'PerHead',
  TRM: 'PerTrip',
  TPM: 'WeeklyMarket',
};

/**
 * Compatibility ONLY, for drafts saved before the catalog key was recorded: a best-effort reading of the facility's type and
 * name. Returns null when nothing matches — it never invents a code — and the caller reports that the identity was inferred.
 */
function legacyCandidateCode(f: DemoFacility): FacilityCodeStr | null {
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
  return null;
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

/**
 * True when the request's "requesting office" is one of the ADDRESSES the assessment form now generates, rather than the name of
 * an office.
 *
 * That field changed meaning: an LGU used to pick its office from a list, and now the form states the municipality's own address
 * instead. Feeding an address to parseOffice does real damage rather than merely reading oddly - it takes the first parenthetical
 * as the office acronym, so "Caraga Region (Region XIII)" made "Region XIII" the acronym printed on that LGU's receipts, and
 * because an acronym WAS found the "no acronym" warning never fired to tell the operator.
 *
 * Requests recorded before the change still hold a genuine office name and must keep working, so this recognises the shape this
 * platform generates rather than guessing at addresses in general: every generated line ends with the country.
 */
function looksLikeMunicipalAddress(value: string): boolean {
  return /,\s*Philippines\s*$/i.test((value || '').trim());
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
  const blockingErrors: string[] = [];
  const facilities: ActivationFacility[] = [];
  const rates: ActivationRate[] = [];
  const customAnimals: ActivationCustomAnimal[] = [];
  const used = new Set<FacilityCodeStr>();

  const demoFacilities = r.config?.facilities ?? [];

  for (const f of demoFacilities) {
    // The facility's identity (FacilityCode) is stable and internal; its NAME is the office's own. The code comes from the
    // type the office chose in the workspace, never from the wording of its name, and is never swapped for another
    // facility's code to resolve a collision — that would file one office's market under another facility's identity.
    const declaredArchetype = archetypeOf(f.type);
    let code: FacilityCodeStr | undefined;
    let custom = false;

    if (f.catalogKey === 'other') {
      custom = true;
    } else if (f.catalogKey) {
      code = CATALOG_CODE[f.catalogKey];
      if (!code) {
        blockingErrors.push(
          `"${f.name}" has a facility type this console does not recognise ("${f.catalogKey}"). Return the draft for LGU review.`,
        );
        continue;
      }
    } else {
      code = legacyCandidateCode(f) ?? undefined;
      if (code) {
        warnings.push(`"${f.name}" was saved before facility types were recorded; it was read as ${code} from its type and name. Confirm this before committing.`);
      } else if (declaredArchetype === 'MonthlyRental' || f.type === 'Custom') {
        custom = true;
        warnings.push(`"${f.name}" matches no standard facility; it is filed as one of the LGU's own monthly-rental facilities.`);
      } else {
        blockingErrors.push(
          `"${f.name}" has an unrecognised billing type ("${f.type}") and matches no facility. Return the draft for LGU review.`,
        );
        continue;
      }
    }

    // An office's own facility is a monthly-rental facility in a reserved custom slot. A standard facility whose archetype
    // contradicts its declared type is refused rather than re-coded.
    if (code && !custom && declaredArchetype !== ARCHETYPE_OF_CODE[code]) {
      blockingErrors.push(
        `"${f.name}" is a ${code} facility but was declared with the billing type "${f.type}". Return the draft for LGU review.`,
      );
      continue;
    }
    if (code && used.has(code)) {
      // A second facility of the same standard type. Only a monthly-rental facility can legitimately move to a custom slot;
      // a market, slaughterhouse, terminal or weekly market cannot be told apart from its twin, so say so.
      if (ARCHETYPE_OF_CODE[code] === 'MonthlyRental') {
        custom = true;
        warnings.push(`"${f.name}" repeats the standard facility ${code}; it is filed as one of the LGU's own monthly-rental facilities.`);
      } else {
        blockingErrors.push(
          `Two facilities resolve to ${code} ("${f.name}" and another). A municipality keeps one facility of this type; ` +
            `return the draft so the LGU keeps one.`,
        );
        continue;
      }
    }
    if (custom) {
      const free = CUSTOM_CODES.find((c) => !used.has(c));
      if (!free) {
        blockingErrors.push(
          `"${f.name}" cannot be filed: a municipality has ${CUSTOM_CODES.length} reserved slots for facilities of its own in total, ` +
            `and the Head Portal's Add Facility uses the same slots, so it cannot be added there later either. ` +
            `Return the draft so the LGU keeps at most ${CUSTOM_CODES.length}.`,
        );
        continue;
      }
      code = free;
    }
    if (!code) continue; // unreachable: every path above sets a code or continues
    const archetype: BillingArchetypeStr = custom ? 'MonthlyRental' : declaredArchetype;
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
      const statedMarketRate =
        num(canonicalPriced[0]?.rate) ?? num((f.sections || []).find((s) => (s.rate ?? '').trim())?.rate) ?? num(f.rateAmount);
      if (statedMarketRate === undefined) {
        // A blank rate is not a zero rate. Filing 0 would make a market that charges nothing look configured.
        blockingErrors.push(`"${f.name}" states no daily rate for any market area. Return the draft for LGU review.`);
        continue;
      }
      const marketRate = statedMarketRate;
      if (marketRate === 0) warnings.push(`"${f.name}" states a daily rate of 0; the market would collect nothing per stall.`);
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
      // Electricity / water. Neither is a facility rate: no billing path reads ElecPerKwh or WaterPerCubicMeter, and which
      // stalls are billed for a utility is decided per stall after activation (utility eligibility, then readings). Filing
      // a row would show a rate the office never charges, and a metered utility has no amount to file in the first place.
      // So none is filed; an amount the office DID state is surfaced to the operator instead of vanishing.
      for (const a of f.addOns || []) {
        const stated = num(a.amount);
        if (stated && stated > 0) {
          warnings.push(
            `"${f.name}" stated ${a.label} at ${stated} (${a.unit || a.basis}). Utility amounts are not filed at activation; ` +
              `the Head sets up utility service per stall after activation.`,
          );
        }
      }
    } else if (archetype === 'WeeklyMarket') {
      const amount = num(f.rateAmount);
      if (amount === undefined) {
        blockingErrors.push(`"${f.name}" states no per-vendor market-day rate. Return the draft for LGU review.`);
        continue;
      }
      rates.push({ facilityCode: code, key: 'TpmVendorDay', amount });
    } else if (archetype === 'PerTrip') {
      const amount = num(f.rateAmount);
      if (amount === undefined) {
        blockingErrors.push(`"${f.name}" states no per-trip rate. Return the draft for LGU review.`);
        continue;
      }
      rates.push({ facilityCode: code, key: 'TrmPerTrip', amount });
    } else if (archetype === 'MonthlyRental') {
      // Rent is set per space after activation; the billing engine reads no facility-level rate for a monthly rental. A
      // figure an older draft carries here is reported so the operator knows it was not filed.
      const stated = num(f.rateAmount);
      if (stated && stated > 0) {
        warnings.push(
          `"${f.name}" stated a monthly rate of ${stated}. Rent is set for each space after activation, so this figure is not filed.`,
        );
      }
    } else if (archetype === 'PerHead') {
      if (f.slaughterhouse) {
        const hog = num(f.slaughterhouse.hogAmount);
        const large = num(f.slaughterhouse.largeAnimalAmount);
        if (hog === undefined || large === undefined) {
          blockingErrors.push(`"${f.name}" states no ${hog === undefined ? 'hog' : 'large-animal'} per-head rate. Return the draft for LGU review.`);
          continue;
        }
        rates.push({ facilityCode: code, key: 'SlhHogPerHead', amount: hog });
        rates.push({ facilityCode: code, key: 'SlhLargePerHead', amount: large });
        for (const item of f.slaughterhouse.customAnimals || []) {
          const perHead = num(item.amount);
          if (perHead === undefined) {
            blockingErrors.push(`"${item.label || '(blank animal name)'}" states no per-head rate. Return the draft for LGU review.`);
            continue;
          }
          customAnimals.push({ animalName: item.label.trim(), ratePerHead: perHead });
        }
      } else {
        // Old submitted drafts may reach Activation without ever being reopened in the new workspace. Interpret only
        // documented whole-word aliases; mixed or generic large-animal wording is sent back for review, never guessed.
        for (const item of f.rateItems || []) {
          const amount = num(item.amount) ?? 0;
          const kind = classifyLegacyAnimal(item.label);
          if (kind === 'Hog') rates.push({ facilityCode: code, key: 'SlhHogPerHead', amount });
          else if (kind === 'Carabao' || kind === 'Cow')
            rates.push({ facilityCode: code, key: 'SlhLargePerHead', amount });
          else if (kind === 'Custom') customAnimals.push({ animalName: item.label.trim(), ratePerHead: amount });
          else
            blockingErrors.push(
              `Legacy animal “${item.label || '(blank animal name)'}” is ambiguous. Return the draft for LGU review.`,
            );
        }
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
  // the requesting office from the original request ONLY when that field still holds an office
  // NAME. Since the assessment form began stating the municipality's address there instead, using
  // it would brand the LGU's receipts with an address and take "Region XIII" as its acronym.
  const requestedOffice = looksLikeMunicipalAddress(r.requestingOffice) ? '' : r.requestingOffice;
  const office = parseOffice(overrides?.officeName || requestedOffice);
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
    assessmentRequestId: r.id,
    municipalityCode: r.municipality.trim(),
    branding: {
      officeName: office.name,
      address: looksLikeMunicipalAddress(r.requestingOffice) ? r.requestingOffice.trim() : null,
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
    slaughterLabels: (() => {
      const slh = demoFacilities.find((f) => f.type === 'Per head')?.slaughterhouse;
      return slh
        ? {
            hog: slh.hogLabel.trim() || 'Hog',
            carabao: slh.carabaoLabel.trim() || 'Carabao',
            cow: slh.cowLabel.trim() || 'Cow',
          }
        : undefined;
    })(),
    orSeries: parseOrSeries(r.config?.orSeries),
    tpmMarketDay,
  };

  // Declared revenue operations. They are shown to the operator and carried into the command as the municipality's operation
  // configuration (listing and local names - presentation only). They cannot block activation for being unfinished, and they enable
  // no service, assign no Collector and file no rate. A single unreadable ITEM is reported as a warning; an unreadable BLOCK is refused below.
  const declaredOperations = declaredRows(r.config?.operations);
  // What activation records as the municipality's operation configuration. Only a block that was actually saved and can be read
  // counts: no block means "never asked" (legacy fallback), and a block this console cannot read is refused rather than guessed
  // at, because sending an empty list would explicitly unlist every operation the office may have chosen.
  if (r.config?.operationsUnreadable) {
    blockingErrors.push(
      'The declared revenue operations are saved in a format this console cannot read. Return the draft for LGU review ' +
        'rather than activating without them.',
    );
  } else if (r.config?.operationsDeclared) {
    command.operationDeclarations = (r.config.operations ?? []).map((o) => ({
      operationCode: o.operationCode,
      selected: o.selected,
      ...(o.selected && o.localDisplayName ? { localDisplayName: o.localDisplayName } : {}),
    }));
  }
  for (const problem of r.config?.operationProblems ?? []) warnings.push(`Declared revenue operations: ${problem}`);

  return { command, warnings, blockingErrors, declaredOperations };
}
