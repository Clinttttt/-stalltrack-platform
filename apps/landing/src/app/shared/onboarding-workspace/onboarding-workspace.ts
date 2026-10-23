import { TERMINAL_LABELS, TerminalChoice, TerminalCode, defaultTerminalChoices, readTerminalSections, terminalNameProblem, writeTerminalSections } from '@stalltrack/terminal-config';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { UiInfoTip } from '@stalltrack/ui';
import { PolishedSelect } from '../polished-select/polished-select';
import {
  MAX_LOCAL_NAME_LENGTH,
  OPERATION_CATALOG,
  OPERATION_GROUPS,
  OperationState,
  localNameProblem,
  describePreserved,
  isEditableOperationsBlock,
  readOperations,
  writeOperations,
} from './onboarding-operations';

/** The reserved custom slots an LGU's own facilities can take (backend FacilityCode.Custom1..Custom5). */
const MAX_CUSTOM_FACILITIES = 5;

// The groups of the official Monthly Income statement (OfficialMonthlyIncomeStructure): Income From Market, Rent Income (Stall
// Rental), Space Rental, Income From Terminal, Income From Slaughterhouse. Grouping is how the workspace PRESENTS choices; it
// never changes a classification. A facility of the office's own uses the existing other-monthly-rent line, so it is shown under rent
// with a note rather than placed by guess.
type RevenueGroupKey = 'market' | 'rent' | 'space' | 'terminal' | 'slaughterhouse';
const REVENUE_GROUPS: ReadonlyArray<{ key: RevenueGroupKey; label: string; hint: string }> = [
  { key: 'market', label: 'Income From Market', hint: 'Market fees, vendor and utility collections, landing and transport fees, the weekly market and the ice plant.' },
  { key: 'rent', label: 'Rent Income — Stall Rental', hint: 'Public market stalls, commercial centers, barbecue stands and other rental facilities. Rent is set for each space after activation.' },
  { key: 'space', label: 'Space Rental', hint: 'Municipal spaces, event lots and vegetable / fruit spaces.' },
  { key: 'terminal', label: 'Income From Terminal', hint: 'The transport terminal and its per-trip fee.' },
  { key: 'slaughterhouse', label: 'Income From Slaughterhouse', hint: 'The slaughterhouse and its per-head animal rates.' },
];
// How each facility type reads on its add button (the catalog label is a longer, picker-style sentence).
const ADD_NAME: Readonly<Record<string, string>> = {
  public_market: 'Public Market',
  commercial: 'Commercial Center',
  barbecue: 'Barbecue stands',
  iceplant: 'Iceplant',
  weekly: 'Weekly market',
  terminal: 'Transport terminal',
  slaughterhouse: 'Slaughterhouse',
  other: 'new stall rental',
};
const GROUP_OF_CATALOG: Readonly<Record<string, RevenueGroupKey>> = {
  public_market: 'rent',
  commercial: 'rent',
  barbecue: 'rent',
  other: 'rent',
  iceplant: 'market',
  weekly: 'market',
  terminal: 'terminal',
  slaughterhouse: 'slaughterhouse',
};

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding configuration workspace (DEMO / local state only).
// Faithful Angular port of the React <OnboardingWorkspace> — same pipeline model,
// same fields, same completion logic. React useState → signals; helper mutators
// mirror the React ones 1:1.
// ─────────────────────────────────────────────────────────────────────────────

interface SectionFee {
  id: string;
  label: string;
  amount: string;
  unit: string;
}
/**
 * The collection area a market section stands for on the daily sheet. The three named values are the backend's
 * MarketSection names verbatim, so the LGU's own declaration travels all the way to its portal without anyone
 * interpreting the section's wording along the way. The section's `name` is the LGU's own label for that area in its
 * own language; the `kind` is what the sheet, the stalls and the fees are keyed on.
 *
 * 'CustomArea' is a market's OWN area, which the platform keys on nothing: it is kept by name in the facility's section
 * registry. A market may have several, and each needs a name - there is nothing else to file it under.
 */
type MarketSectionKind = 'VegetableArea' | 'FishSection' | 'MeatSection' | 'CustomArea';

interface FacilitySection {
  id: string;
  /** The LGU's own name for this area, in its own language (e.g. "Gulayan", "Isda", "Karne"). */
  name: string;
  /** Which collection area of the daily sheet this section is. Declared by the LGU, never inferred. */
  kind: MarketSectionKind;
  units: string;
  rate: string;
  fees: SectionFee[];
}
interface AddOn {
  id: string;
  label: string;
  basis: string;
  amount: string;
  unit: string;
  mode: string;
}
interface RateItem {
  id: string;
  label: string;
  amount: string;
}
interface SlaughterhouseConfig {
  hogLabel: string;
  hogAmount: string;
  carabaoLabel: string;
  cowLabel: string;
  largeAnimalAmount: string;
  customAnimals: RateItem[];
  legacyReviewRequired?: boolean;
  legacyReviewMessages?: string[];
}
interface Facility {
  id: string;
  catalogKey: string;
  /** Defaults to StallRent for older draft configurations. */
  customCategory?: 'StallRent' | 'SpaceRental';
  archetype: string;
  name: string;
  type: string;
  rateAmount: string;
  /**
   * A daily-stall market only: the MONTHLY rent a space is let for, if your ordinance states one. The daily rate
   * above is the installment it is collected in. Left empty, a month is taken as thirty daily rates.
   */
  monthlyRent: string;
  /**
   * A daily-stall market only: how the office measures what a MONTH owes.
   *
   * `RentGoal` — the month is let for a rent and collected in daily installments, so February owes the same as August and a
   * short month is topped up at month end. `PureDays` — the month owes the days it has, so a 31-day month owes thirty-one
   * daily rates and February twenty-eight, and there is nothing to top up.
   *
   * Empty means the rent goal, which is what every ordinance this platform was built against states.
   */
  monthBasis: string;
  /**
   * Public Market only: how the LGU rents its stalls. `monthly` is STANDARD MONTHLY RENTAL - one monthly obligation per stall that
   * can be paid in full or in installments, like a commercial center, with no daily charge. Empty or `daily` is the daily-collected
   * market (rent collected per day, or by the days of the month). Stated by the LGU, never inferred from a rate or a name.
   */
  rentalModel: string;
  rateUnit: string;
  unitLabel: string;
  units: string;
  ordinance: string;
  notes: string;
  marketDay: string;
  sections: FacilitySection[];
  addOns: AddOn[];
  slaughterhouse?: SlaughterhouseConfig;
  /** Rows saved before slaughterhouse semantics became explicit. Never emitted by a newly saved draft. */
  rateItems?: RateItem[];
}
interface CatalogItem {
  key: string;
  label: string;
  type: string;
  unitLabel: string;
  archetype: string;
}

const uid = (): string => Math.random().toString(36).slice(2, 9);
const shortName = (label: string): string => label.split(' — ')[0].split(' / ')[0].trim();


// The three collection areas a public-market daily sheet is organised into, plus the market's own. An LGU declares
// which area each of its sections is and names it itself; the platform never reads meaning out of the name.
const SECTION_KINDS: ReadonlyArray<{ value: MarketSectionKind; label: string }> = [
  { value: 'VegetableArea', label: 'Vegetable area' },
  { value: 'FishSection', label: 'Fish section (weighed)' },
  { value: 'MeatSection', label: 'Meat section' },
  { value: 'CustomArea', label: 'Other area' },
];
// The three canonical areas may each be defined once. A market's own areas are as many as it has, capped so the form
// stays a form; five is more than any market in the cluster keeps beyond the three.
const CANONICAL_KINDS: ReadonlyArray<MarketSectionKind> = ['VegetableArea', 'FishSection', 'MeatSection'];
const MAX_CUSTOM_SECTIONS = 5;
const MAX_SECTIONS = CANONICAL_KINDS.length + MAX_CUSTOM_SECTIONS;
const SECTION_NAME_PLACEHOLDER: Record<MarketSectionKind, string> = {
  VegetableArea: 'e.g. Vegetable Area, or Gulayan',
  FishSection: 'e.g. Fish Section, or Isda',
  MeatSection: 'e.g. Meat Section, or Karne',
  CustomArea: 'e.g. Rice Section, or Bigasan',
};
// Electricity / water are no longer entered as facility fees: they are declared under Revenue Operations and set up per stall
// after activation. An add-on an older draft already holds is kept and shown read-only, so nothing the office typed is lost.
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CATALOG: CatalogItem[] = [
  { key: 'public_market', label: 'Public Market — stall rental', type: 'Daily stall', unitLabel: 'stalls', archetype: 'DailyStall' },
  { key: 'commercial', label: 'Commercial Center / spaces — monthly rental', type: 'Monthly rental', unitLabel: 'spaces', archetype: 'MonthlyRental' },
  { key: 'barbecue', label: 'Barbecue / food stalls', type: 'Monthly rental', unitLabel: 'stalls', archetype: 'MonthlyRental' },
  { key: 'iceplant', label: 'Iceplant / cold storage', type: 'Monthly rental', unitLabel: 'units', archetype: 'MonthlyRental' },
  { key: 'slaughterhouse', label: 'Slaughterhouse — per head', type: 'Per head', unitLabel: 'heads', archetype: 'PerHead' },
  { key: 'terminal', label: 'Transport / Bus Terminal — per trip', type: 'Per trip', unitLabel: 'trips', archetype: 'PerTrip' },
  { key: 'weekly', label: 'Weekly / Tabo market — market day', type: 'Weekly market', unitLabel: 'vendors', archetype: 'WeeklyMarket' },
  { key: 'other', label: 'Custom monthly stall rental', type: 'Custom', unitLabel: 'units', archetype: 'Custom' },
];

const RATE_UNIT_FOR: Record<string, string> = {
  'Daily stall': 'per day',
  'Monthly rental': 'per month',
  'Weekly market': 'per vendor',
  'Per trip': 'per trip',
  'Per head': 'per head',
  Custom: 'per month',
};
const RATE_PLACEHOLDER: Record<string, string> = {
  'Daily stall': '30',
  'Monthly rental': '2400',
  'Weekly market': '100',
  'Per trip': '30',
  'Per head': '',
  Custom: '100',
};

// The card header already states each facility's billing model beside its name, so a second "Daily stall · per stall" chip inside
// the open card repeated it two inches lower and crowded the field it sat next to. The billing model is still stated - once.
// Base-rate help text per facility type (only for types that keep a facility-level rate).
const RATE_HELP: Record<string, string> = {
  'Monthly rental': 'per month',
  'Per trip': 'per trip',
  'Weekly market': 'per vendor, per market day',
  Custom: 'per unit',
};

function newSection(kind: MarketSectionKind): FacilitySection {
  return { id: uid(), name: '', kind, units: '', rate: '', fees: kind === 'FishSection' ? fishFeesFor([]) : [] };
}

/** The fish area's per-kilo weighing fee, keeping whatever amount the LGU has already entered. */
function fishFeesFor(existing: SectionFee[]): SectionFee[] {
  if (existing.length > 0) return existing;
  return [{ id: uid(), label: 'Fish (per kilo)', amount: '', unit: 'per kilo' }];
}

/**
 * Fills in the collection area for sections saved before an LGU was asked to declare one, taking them in
 * the order they were entered. This is a starting point the LGU sees and can correct in the form before it
 * submits, never a final answer read out of the section's wording. A section already declared as the market's own area
 * is left alone and takes none of the three slots.
 */
function normalizeSections(sections: FacilitySection[]): FacilitySection[] {
  const taken = new Set(
    sections.map((s) => s?.kind).filter((k): k is MarketSectionKind => Boolean(k) && CANONICAL_KINDS.includes(k)),
  );
  return sections.map((s) => {
    if (s?.kind && SECTION_KINDS.some((k) => k.value === s.kind)) return s;
    const kind = CANONICAL_KINDS.find((k) => !taken.has(k)) ?? 'VegetableArea';
    taken.add(kind);
    return { ...s, kind, fees: kind === 'FishSection' ? fishFeesFor(s?.fees ?? []) : [] };
  });
}

function facilityFrom(c: CatalogItem): Facility {
  return {
    id: uid(),
    catalogKey: c.key,
    customCategory: c.key === 'other' ? 'StallRent' : undefined,
    archetype: c.archetype,
    name: c.key === 'other' ? '' : shortName(c.label),
    type: c.type,
    rateAmount: '',
    monthlyRent: '',
    monthBasis: 'RentGoal',
    rentalModel: 'daily',
    rateUnit: RATE_UNIT_FOR[c.type] || 'per month',
    unitLabel: c.unitLabel,
    units: '',
    ordinance: '',
    notes: '',
    marketDay: c.type === 'Weekly market' ? 'Friday' : '',
    sections: [],
    addOns: [],
    slaughterhouse: c.key === 'slaughterhouse' ? emptySlaughterhouseConfig() : undefined,
  };
}

function emptySlaughterhouseConfig(): SlaughterhouseConfig {
  return {
    hogLabel: 'Hog',
    hogAmount: '',
    carabaoLabel: 'Carabao',
    cowLabel: 'Cow',
    largeAnimalAmount: '',
    customAnimals: [],
  };
}

type LegacyAnimalKind = 'Hog' | 'Carabao' | 'Cow' | 'Custom' | 'Review';

/** Compatibility only: new drafts state semantics directly and never call this classifier. */
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

/** Converts an old free-text SLH document into the explicit editor without guessing through contradictions. */
function migrateLegacySlaughterhouse(items: RateItem[]): SlaughterhouseConfig {
  const config = emptySlaughterhouseConfig();
  const messages: string[] = [];
  const hogRows: RateItem[] = [];
  const largeRows: Array<{ row: RateItem; kind: 'Carabao' | 'Cow' }> = [];

  for (const row of items) {
    const kind = classifyLegacyAnimal(row.label ?? '');
    if (kind === 'Hog') hogRows.push(row);
    else if (kind === 'Carabao' || kind === 'Cow') largeRows.push({ row, kind });
    else if (kind === 'Custom') config.customAnimals.push({ ...row, id: row.id || uid() });
    else messages.push(`“${row.label || '(blank animal name)'}” needs review because its canonical meaning is ambiguous.`);
  }

  const hogAmounts = [...new Set(hogRows.map((x) => x.amount).filter((x) => String(x).trim()))];
  if (hogAmounts.length > 1) messages.push(`Legacy Hog rows state different rates: ${hogAmounts.join(' and ')}.`);
  else if (hogRows.length) {
    config.hogLabel = hogRows[0].label.trim() || 'Hog';
    config.hogAmount = hogAmounts[0] ?? '';
  }

  const largeAmounts = [...new Set(largeRows.map((x) => x.row.amount).filter((x) => String(x).trim()))];
  if (largeAmounts.length > 1)
    messages.push(`Legacy Carabao/Cow rows state different shared large-animal rates: ${largeAmounts.join(' and ')}.`);
  else config.largeAnimalAmount = largeAmounts[0] ?? '';

  const carabao = largeRows.find((x) => x.kind === 'Carabao')?.row.label.trim();
  const cow = largeRows.find((x) => x.kind === 'Cow')?.row.label.trim();
  if (carabao) config.carabaoLabel = carabao;
  if (cow) config.cowLabel = cow;

  if (messages.length) {
    config.legacyReviewRequired = true;
    config.legacyReviewMessages = messages;
  }
  return config;
}

@Component({
  selector: 'app-onboarding-workspace',
  standalone: true,
  imports: [PolishedSelect, NgTemplateOutlet, UiInfoTip],
  templateUrl: './onboarding-workspace.html',
})
export class OnboardingWorkspace {
  readonly municipalityName = input('');
  /** Initial config document to hydrate the workspace (from the saved draft). */
  readonly configJson = input<string | null>(null);
  /** Disables actions while the parent is saving/submitting. */
  readonly busy = input(false);
  /** Whether the draft is already submitted for validation (shows the submitted view). */
  readonly submitted = input(false);
  readonly saveDraft = output<string>();
  readonly submitDraft = output<string>();
  readonly edit = output<void>();
  private hydrated = false;

  // Design-system class strings (mirror the React module constants).
  readonly INPUT =
    'w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-civic focus:ring-2 focus:ring-civic/20';
  readonly MONEY_INPUT = this.INPUT + ' pl-7';
  readonly LABEL = 'block text-sm font-medium text-ink mb-1.5';

  readonly operationGroups = OPERATION_GROUPS;
  readonly maxLocalName = MAX_LOCAL_NAME_LENGTH;
  readonly days = DAYS;
  readonly catalog = CATALOG;
  readonly ratePlaceholder = RATE_PLACEHOLDER;

  // Start empty — the LGU adds each facility and sets its own rate. Nothing is pre-filled or auto-marked
  // Done on first open. A saved draft (configJson) re-hydrates the LGU's own previously entered values.
  readonly facilities = signal<Facility[]>([]);

  readonly expandedId = signal<string | null>(null);
  readonly picking = signal(false);
  readonly admin = signal({ name: '', position: '', email: '' });
  readonly branding = signal({ officeName: '', orPrefix: '', orStart: '', logoName: '', logoDataUri: '' });
  readonly logoPreview = signal('');
  readonly logoError = signal('');

  constructor() {
    // Hydrate the editor from the saved draft config once it arrives from the parent.
    effect(() => {
      const json = this.configJson();
      if (json && !this.hydrated) {
        this.hydrate(json);
        this.hydrated = true;
      }
    });
  }

  // ── completion logic (mirrors React) ──────────────────────────────────────
  readonly doneFacilities = computed(() => this.facilities().filter((f) => this.isFacilityDone(f)).length);
  readonly facilitiesDone = computed(
    () => this.facilities().length > 0 && this.doneFacilities() === this.facilities().length,
  );
  readonly adminDone = computed(() => Boolean(this.admin().name.trim() && this.admin().email.trim()));
  readonly brandingDone = computed(() =>
    Boolean(this.branding().officeName.trim()),
  );
  readonly sectionFlags = computed(() => [this.facilitiesDone(), this.adminDone(), this.brandingDone()]);
  readonly doneCount = computed(() => this.sectionFlags().filter(Boolean).length);
  readonly allDone = computed(() => this.doneCount() === this.sectionFlags().length);

  /** The same three completion flags, in page order, named for the stepper and for the list of what is still missing. */
  readonly steps = computed(() => [
    { id: 'sec-head', label: 'Head account', done: this.adminDone() },
    { id: 'sec-branding', label: 'Branding & receipts', done: this.brandingDone() },
    { id: 'sec-ops', label: 'Facilities & operations', done: this.facilitiesDone() },
  ]);
  readonly missing = computed(() => this.steps().filter((x) => !x.done));

  jumpTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  readonly pct = computed(() => Math.round((this.doneCount() / this.sectionFlags().length) * 100));

  isPerHead = (f: Facility): boolean => f.type === 'Per head';
  /**
   * A section is the fish section when the LGU said so, not when its wording happens to contain "fish" —
   * an LGU naming it "Isda" keeps the per-kilo weighing fee it is entitled to.
   */
  isFishSection = (s: FacilitySection): boolean => s.kind === 'FishSection';
  /** Example name for this area, in the LGU's own words. */
  sectionNamePlaceholder(s: FacilitySection): string {
    return SECTION_NAME_PLACEHOLDER[s.kind] ?? 'e.g. Section name';
  }
  /** The market's own area, which the platform keys on nothing: it is kept by name. */
  isCustomArea = (s: FacilitySection): boolean => s.kind === 'CustomArea';
  /**
   * The areas this row may be set to: the three, minus any another row has already taken, plus the market's own -
   * which is always available, because a market may have several and each is told apart by its name.
   */
  sectionKindOptions(f: Facility, s: FacilitySection): ReadonlyArray<{ value: string; label: string }> {
    const taken = new Set(f.sections.filter((x) => x.id !== s.id).map((x) => x.kind));
    return SECTION_KINDS.filter((k) => k.value === 'CustomArea' || k.value === s.kind || !taken.has(k.value));
  }
  /** A market keeps one section per canonical area, and as many of its own as it has, up to the form's cap. */
  canAddSection(f: Facility): boolean {
    return f.sections.length < MAX_SECTIONS;
  }
  /** An area of the market's own must be named: the name is the only thing it can be filed under. */
  needsOwnName = (s: FacilitySection): boolean => s.kind === 'CustomArea' && !(s.name || '').trim();
  /**
   * Whether this facility keeps a facility-level rate the platform actually files: a per-trip terminal fee and a weekly
   * market's per-vendor fee. A monthly rental (and an office's own facility) has none — rent is set for each space after
   * activation, and asking for a figure here would show the office a rate that is never used.
   */
  showBaseRate = (f: Facility): boolean => f.type === 'Per trip' || f.type === 'Weekly market';
  /** A facility whose rent is set per space after activation. */
  isRentSetPerSpace = (f: Facility): boolean => f.type === 'Monthly rental' || f.type === 'Custom';
  isFacilityDone = (f: Facility): boolean => {
    if (!f.name.trim()) return false;
    if (f.type === 'Per head') {
      const s = f.slaughterhouse;
      if (!s || s.legacyReviewRequired) return false;
      if (!s.hogLabel.trim() || !s.carabaoLabel.trim() || !s.cowLabel.trim()) return false;
      if (!s.hogAmount.trim() || !s.largeAnimalAmount.trim()) return false;
      return s.customAnimals.every((a) => a.label.trim() && a.amount.trim());
    }
    if (f.type === 'Daily stall') {
      // An area of the market's own is filed under its name, so an unnamed one holds the facility open rather than
      // being quietly dropped on the way to the platform.
      if (f.sections.some((s) => this.needsOwnName(s))) return false;
      // A market rented by the month prices no area here: each stall's rent is set in the portal after activation.
      if (f.rentalModel === 'monthly') return true;
      return f.sections.some((s) => (s.rate || '').trim());
    }
    // Rent for a monthly rental is set per space after activation, so a name is all that is needed here.
    if (this.isRentSetPerSpace(f)) return true;
    return Boolean(f.rateAmount);
  };

  /** Help text for the facility-level base rate (Monthly rental / Per trip / Weekly market / Custom). */
  rateHelpFor(type: string): string {
    return RATE_HELP[type] || 'per unit';
  }

  summaryFor(f: Facility): string {
    if (this.isPerHead(f)) {
      const s = f.slaughterhouse;
      if (!s) return '';
      const n = Number(Boolean(s.hogAmount)) + 2 * Number(Boolean(s.largeAnimalAmount)) + s.customAnimals.filter((r) => r.amount).length;
      return n ? `${n} animal type(s)` : '';
    }
    if (f.type === 'Daily stall' && f.rentalModel === 'monthly') return 'monthly rent set per stall';
    if (f.type === 'Daily stall') {
      const priced = f.sections.filter((s) => (s.rate || '').trim());
      if (!priced.length) return '';
      return priced.length === 1 ? `₱${priced[0].rate} per day` : `${priced.length} priced areas`;
    }
    if (this.isRentSetPerSpace(f)) return 'rent set per space';
    return f.rateAmount ? `₱${f.rateAmount} ${f.rateUnit}` : '';
  }

  sectionTotal(f: Facility): number {
    return f.sections.reduce((s, x) => s + (parseInt(x.units, 10) || 0), 0);
  }

  ratePlaceholderFor(type: string): string {
    return this.ratePlaceholder[type] || '0';
  }

  /**
   * What thirty of the market's own daily rate comes to — shown as the placeholder so the office can see the figure
   * that will be used if it states nothing, and correct it if its ordinance says otherwise.
   */
  monthlyRentPlaceholder(f: Facility): string {
    const daily = f.sections.map((s) => parseFloat((s.rate || '').trim())).find((n) => !isNaN(n) && n > 0);
    return daily ? String(daily * 30) : '900';
  }

  // ── facility mutators (mirror React) ───────────────────────────────────────
  private mapFacility(fid: string, fn: (f: Facility) => Facility): void {
    this.facilities.update((f) => f.map((x) => (x.id === fid ? fn(x) : x)));
  }

  removeFacility(id: string): void {
    this.facilities.update((f) => f.filter((x) => x.id !== id));
  }
  setFacility(id: string, key: keyof Facility, val: string): void {
    this.mapFacility(id, (x) => ({ ...x, [key]: val }));
  }
  addFromCatalog(c: CatalogItem, category: 'StallRent' | 'SpaceRental' = 'StallRent'): void {
    // A non-custom facility type can be configured only once; block re-adding a type already present.
    // 'other' (custom facility) may be added many times.
    if (this.isCatalogUsed(c)) return;

    // And nothing is added while a facility already on the page is unfinished. Refused here as well as disabled on the
    // button, because a disabled control is not a guard - the picker can be open when the last field is cleared.
    if (this.unfinishedFacility()) return;

    const nf = { ...facilityFrom(c), customCategory: c.key === 'other' ? category : undefined };
    this.facilities.update((f) => [...f, nf]);
    this.expandedId.set(nf.id);
    this.picking.set(false);
  }

  /**
   * The first facility on the page that is not configured yet, or null when every one is done.
   *
   * An office could add facility after facility while every card sat empty, ending with a list of names it then had to work
   * backwards through - and an empty facility carries no rate, so it would have reached the platform as a space nobody can be
   * billed for. One at a time, finished before the next is offered.
   */
  readonly unfinishedFacility = computed(() => this.facilities().find((f) => !this.isFacilityDone(f)) ?? null);

  /** What is missing on the unfinished facility, for the message beside the disabled Add button. */
  unfinishedFacilityLabel(): string {
    const f = this.unfinishedFacility();
    if (!f) return '';

    return f.name.trim() ? f.name.trim() : 'the facility above';
  }

  addCustomSpace(): void {
    const custom = CATALOG.find((c) => c.key === 'other');
    if (custom) this.addFromCatalog(custom, 'SpaceRental');
  }

  setCustomCategory(id: string, category: 'StallRent' | 'SpaceRental'): void {
    this.mapFacility(id, f => f.catalogKey === 'other' ? { ...f, customCategory: category } : f);
  }

  /** True when this catalog type is already configured (so it can't be added again). Custom is exempt. */
  isCatalogUsed(c: CatalogItem): boolean {
    // The office's own facilities take a reserved custom slot each; once they are all used there is nowhere to file another.
    if (c.key === 'other') return this.customFacilityCount() >= MAX_CUSTOM_FACILITIES;
    return this.facilities().some((f) => f.catalogKey === c.key);
  }
  readonly customFacilityCount = computed(() => this.facilities().filter((f) => f.catalogKey === 'other').length);
  toggleExpanded(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  // sections
  addSection(fid: string): void {
    this.mapFacility(fid, (x) => {
      if (x.sections.length >= MAX_SECTIONS) return x;
      // One section per canonical area: the new row takes the first of the three the market has not defined yet, and
      // once all three are defined it is an area of the market's own, which it names itself.
      const taken = new Set(x.sections.map((s) => s.kind));
      const kind = CANONICAL_KINDS.find((k) => !taken.has(k)) ?? 'CustomArea';
      return { ...x, sections: [...x.sections, newSection(kind)] };
    });
  }
  removeSection(fid: string, sid: string): void {
    this.mapFacility(fid, (x) => ({ ...x, sections: x.sections.filter((s) => s.id !== sid) }));
  }
  /**
   * Changes which collection area a section stands for. The per-kilo weighing fee belongs to the fish area,
   * so it is added when the LGU says a section is the fish section and withdrawn when it says otherwise.
   */
  setSectionKind(fid: string, sid: string, kind: string): void {
    if (!SECTION_KINDS.some((k) => k.value === kind)) return;
    this.mapFacility(fid, (x) => ({
      ...x,
      sections: x.sections.map((s) => {
        if (s.id !== sid) return s;
        const next: FacilitySection = { ...s, kind: kind as MarketSectionKind };
        next.fees = kind === 'FishSection' ? fishFeesFor(s.fees) : [];
        return next;
      }),
    }));
  }
  setSection(fid: string, sid: string, key: keyof FacilitySection, val: string): void {
    this.mapFacility(fid, (x) => ({
      ...x,
      // The name is the LGU's own label and carries no meaning to the platform — renaming an area never
      // adds or removes a fee. The area's fees follow its declared kind (see setSectionKind).
      sections: x.sections.map((s) => (s.id === sid ? { ...s, [key]: val } : s)),
    }));
  }
  addSecFee(fid: string, sid: string): void {
    this.mapFacility(fid, (x) => ({
      ...x,
      sections: x.sections.map((s) =>
        s.id === sid ? { ...s, fees: [...s.fees, { id: uid(), label: '', amount: '', unit: 'per kilo' }] } : s,
      ),
    }));
  }
  removeSecFee(fid: string, sid: string, feeId: string): void {
    this.mapFacility(fid, (x) => ({
      ...x,
      sections: x.sections.map((s) => (s.id === sid ? { ...s, fees: s.fees.filter((z) => z.id !== feeId) } : s)),
    }));
  }
  setSecFee(fid: string, sid: string, feeId: string, key: keyof SectionFee, val: string): void {
    this.mapFacility(fid, (x) => ({
      ...x,
      sections: x.sections.map((s) =>
        s.id === sid ? { ...s, fees: s.fees.map((z) => (z.id === feeId ? { ...z, [key]: val } : z)) } : s,
      ),
    }));
  }

  // Explicit slaughterhouse semantics. Canonical identity never comes from an office label.
  setSlaughterhouse(fid: string, key: keyof Omit<SlaughterhouseConfig, 'customAnimals' | 'legacyReviewMessages'>, val: string | boolean): void {
    this.mapFacility(fid, (x) => ({
      ...x,
      slaughterhouse: { ...(x.slaughterhouse ?? emptySlaughterhouseConfig()), [key]: val },
    }));
  }
  confirmLegacySlaughterhouseReview(fid: string): void {
    this.mapFacility(fid, (x) => ({
      ...x,
      slaughterhouse: {
        ...(x.slaughterhouse ?? emptySlaughterhouseConfig()),
        legacyReviewRequired: false,
        legacyReviewMessages: [],
      },
    }));
  }
  addCustomAnimal(fid: string): void {
    this.mapFacility(fid, (x) => {
      const s = x.slaughterhouse ?? emptySlaughterhouseConfig();
      return { ...x, slaughterhouse: { ...s, customAnimals: [...s.customAnimals, { id: uid(), label: '', amount: '' }] } };
    });
  }
  removeCustomAnimal(fid: string, rid: string): void {
    this.mapFacility(fid, (x) => {
      const s = x.slaughterhouse ?? emptySlaughterhouseConfig();
      return { ...x, slaughterhouse: { ...s, customAnimals: s.customAnimals.filter((r) => r.id !== rid) } };
    });
  }
  setCustomAnimal(fid: string, rid: string, key: keyof RateItem, val: string): void {
    this.mapFacility(fid, (x) => ({
      ...x,
      slaughterhouse: {
        ...(x.slaughterhouse ?? emptySlaughterhouseConfig()),
        customAnimals: (x.slaughterhouse ?? emptySlaughterhouseConfig()).customAnimals.map((r) =>
          r.id === rid ? { ...r, [key]: val } : r,
        ),
      },
    }));
  }

  // A fee an older draft saved on a facility. It can be removed but no longer added: see the note above DAYS.
  removeFee(fid: string, feeId: string): void {
    this.mapFacility(fid, (x) => ({ ...x, addOns: x.addOns.filter((a) => a.id !== feeId) }));
  }

  // ── revenue operations (initial intent only) ──────────────────────────────
  readonly terminalChoices = signal<TerminalChoice[]>(defaultTerminalChoices());
  readonly terminalLabels = TERMINAL_LABELS;
  readonly lockedTerminal = signal<unknown | undefined>(undefined);
  readonly terminalValid = computed(() => !terminalNameProblem(this.terminalChoices()));
  readonly terminalProblem = computed(() => terminalNameProblem(this.terminalChoices()));
  toggleTerminal(section: TerminalCode): void {
    this.terminalChoices.update((rows) => rows.map((x) => x.section === section ? { ...x, isEnabled: !x.isEnabled } : x));
  }
  nameTerminal(section: TerminalCode, name: string): void {
    this.terminalChoices.update((rows) => rows.map((x) => x.section === section ? { ...x, localDisplayName: name.slice(0, 80) } : x));
  }
  readonly operationCatalog = OPERATION_CATALOG;
  readonly operations = signal<Record<string, OperationState>>({});
  // Independent operation-level weighing, not NPM section pricing. No other LGU's rates are prefilled.
  readonly weighing = signal({ fishEnabled: false, fishRate: '', meatEnabled: false, meatRate: '' });
  setWeighing(key: 'fishEnabled' | 'fishRate' | 'meatEnabled' | 'meatRate', value: boolean | string): void {
    this.weighing.update((w) => ({ ...w, [key]: value }));
  }
  readonly lockedWeighing = signal<unknown | undefined>(undefined);
  readonly weighingValid = computed(() => {
    if (this.lockedWeighing() !== undefined) return false;
    if (!this.isOperationSelected('WEIGHT_AND_MEASURE')) return true;
    const w = this.weighing();
    const valid = (active: boolean, raw: string) => !active || (raw.trim() !== '' && Number.isFinite(Number(raw))
      && Number(raw) > 0 && Number(raw) <= 999999 && Math.abs(Math.round(Number(raw) * 100) - Number(raw) * 100) < 0.000001);
    return valid(w.fishEnabled, w.fishRate) && valid(w.meatEnabled, w.meatRate);
  });
  /** Codes in a saved draft that this workspace does not recognise; shown once so nothing vanishes silently. */
  readonly preservedOperations = signal<unknown[]>([]);
  readonly preservedOperationNames = computed(() => this.preservedOperations().map(describePreserved));
  /** Block-level fields beyond `version` and `items`, written back untouched. */
  private operationsExtras: Record<string, unknown> = {};
  /**
   * A whole `operations` block this version cannot safely edit (a newer version or another shape). It is held verbatim and
   * written back byte-for-byte; the editor is withdrawn rather than risk rewriting or downgrading it.
   */
  readonly lockedOperations = signal<unknown>(null);
  readonly lockedOperationsVersion = computed(() => {
    const v = (this.lockedOperations() as { version?: unknown } | null)?.version;
    return v == null ? 'unstated' : String(v);
  });
  /** Discarding is two steps on purpose: the first click only asks. */
  readonly confirmingDiscard = signal(false);
  askDiscardOperations(): void {
    this.confirmingDiscard.set(true);
  }
  cancelDiscardOperations(): void {
    this.confirmingDiscard.set(false);
  }
  /**
   * Explicit, confirmed removal of ONLY the saved entries this version cannot edit. Everything else in the block - the operations
   * the office chose and any block-level fields it does not own - is kept exactly as it was.
   */
  discardPreservedEntries(): void {
    this.preservedOperations.set([]);
    this.confirmingDiscard.set(false);
  }
  /** Explicit, confirmed removal of a whole block this version cannot read. Nothing of it can be kept, so it starts empty. */
  discardLockedOperations(): void {
    this.lockedOperations.set(null);
    this.operationsExtras = {};
    this.preservedOperations.set([]);
    this.confirmingDiscard.set(false);
  }
  /** @deprecated Kept for callers that discard everything unreadable at once; prefer the two precise methods above. */
  discardPreservedOperations(): void {
    this.discardLockedOperations();
  }

  // ── revenue groups (the official Monthly Income structure) ────────────────────────────────────
  readonly revenueGroups = REVENUE_GROUPS;
  /** Which official group a facility sits under. From the type the office chose; a legacy draft falls back on its billing type. */
  groupOfFacility(f: Facility): RevenueGroupKey {
    if (f.catalogKey === 'other') return f.customCategory === 'SpaceRental' ? 'space' : 'rent';
    const byKey = f.catalogKey ? GROUP_OF_CATALOG[f.catalogKey] : undefined;
    if (byKey) return byKey;
    switch (f.type) {
      case 'Per head': return 'slaughterhouse';
      case 'Per trip': return 'terminal';
      case 'Weekly market': return 'market';
      default: return 'rent';
    }
  }
  facilitiesInGroup(key: string): Facility[] {
    return this.facilities().filter((f) => this.groupOfFacility(f) === key);
  }
  catalogInGroup(key: string): CatalogItem[] {
    return CATALOG.filter((c) => GROUP_OF_CATALOG[c.key] === key);
  }
  operationsInGroup(key: string) {
    return OPERATION_CATALOG.filter((o) => (o.group === 'space' ? 'space' : 'market') === key);
  }
  /** The short name of a facility type, as the add button reads it. */
  catalogName(c: CatalogItem): string {
    return ADD_NAME[c.key] ?? shortName(c.label);
  }

  isOperationSelected(code: string): boolean {
    return this.operations()[code]?.selected === true;
  }
  operationName(code: string): string {
    return this.operations()[code]?.localDisplayName ?? '';
  }
  toggleOperation(code: string): void {
    this.operations.update((o) => ({
      ...o,
      [code]: { selected: !(o[code]?.selected === true), localDisplayName: o[code]?.localDisplayName ?? '' },
    }));
  }
  setOperationName(code: string, val: string): void {
    this.operations.update((o) => ({
      ...o,
      [code]: { selected: o[code]?.selected === true, localDisplayName: val.slice(0, MAX_LOCAL_NAME_LENGTH) },
    }));
  }
  operationProblem(code: string): string {
    return localNameProblem(code, this.operations());
  }
  readonly operationsValid = computed(() => OPERATION_CATALOG.every((o) => !localNameProblem(o.code, this.operations())));
  readonly selectedOperationCount = computed(() => OPERATION_CATALOG.filter((o) => this.operations()[o.code]?.selected).length);

  /** What the office's own facilities already cover, so the operations list does not ask the same question twice. */
  readonly facilityOwnedOperations = computed(() => {
    const out: string[] = [];
    for (const f of this.facilities()) {
      const name = f.name.trim() || 'this facility';
      switch (f.catalogKey) {
        case 'public_market': out.push(`Stall fees — ${name}`); break;
        case 'slaughterhouse': out.push(`Slaughterhouse — ${name}`); break;
        case 'terminal': out.push(`Terminal — ${name}`); break;
        case 'weekly': out.push(`Weekly market — ${name}`); break;
        case 'other': out.push((f.customCategory === 'SpaceRental' ? 'Space rental' : 'Stall rental') + ' — ' + name); break;
        default: out.push(`Space rental — ${name}`);
      }
    }
    return out;
  });

  // admin / branding
  setAdmin(key: 'name' | 'position' | 'email', val: string): void {
    this.admin.update((h) => ({ ...h, [key]: val }));
  }
  setBranding(key: 'officeName' | 'orPrefix' | 'orStart' | 'logoName' | 'logoDataUri', val: string): void {
    this.branding.update((b) => ({ ...b, [key]: val }));
  }
  onLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    // The seal is stored inline (base64 data URI) and returned with the LGU's branding, so keep it small.
    if (file.size > 200 * 1024) {
      this.logoError.set('Logo is too large — please use an image under 200 KB.');
      return;
    }
    this.logoError.set('');
    this.setBranding('logoName', file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = typeof reader.result === 'string' ? reader.result : '';
      this.setBranding('logoDataUri', dataUri);
      this.logoPreview.set(dataUri);
    };
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (this.allDone() && this.operationsValid() && this.weighingValid() && this.terminalValid() && this.lockedTerminal() === undefined) this.submitDraft.emit(this.serialize());
  }
  editSubmission(): void {
    this.edit.emit();
  }
  saveProgress(): void {
    this.saveDraft.emit(this.serialize());
  }

  /**
   * Top-level fields of a saved document this workspace does not own. They are written back untouched, so a document
   * saved by a newer workspace (or carrying a field a coordinator added) is not stripped by saving it here.
   */
  private extras: Record<string, unknown> = {};

  private serialize(): string {
    const facilities = this.facilities().map(({ rateItems: _legacy, ...f }) => f);
    return JSON.stringify({
      ...this.extras,
      facilities,
      administrator: this.admin(),
      branding: this.branding(),
      // Entries this version cannot edit go back exactly as they were read: saving another field never erases them.
      terminalSections: this.lockedTerminal() !== undefined ? this.lockedTerminal() : writeTerminalSections(this.terminalChoices()),
      operations:
        this.lockedOperations() !== null
          ? this.lockedOperations()
          : writeOperations(this.operations(), this.preservedOperations(), this.operationsExtras),
      weighing: this.lockedWeighing() ?? { version: 1, ...this.weighing() },
    });
  }

  private hydrate(json: string): void {
    try {
      const cfg = JSON.parse(json) as {
        facilities?: Facility[];
        administrator?: { name?: string; position?: string; email?: string };
        branding?: { officeName?: string; orPrefix?: string; orStart?: string; logoName?: string; logoDataUri?: string };
        operations?: unknown;
        terminalSections?: unknown;
        weighing?: { version?: number; fishEnabled?: boolean; fishRate?: string; meatEnabled?: boolean; meatRate?: string };
      };
      const { facilities: _f, administrator: _a, branding: _b, operations: _o, terminalSections: _t, weighing: _w, ...rest } = cfg as Record<string, unknown>;
      this.extras = rest;
      if (cfg.weighing?.version === 1) {
        if (typeof cfg.weighing.fishEnabled !== 'boolean' || typeof cfg.weighing.meatEnabled !== 'boolean'
          || typeof cfg.weighing.fishRate !== 'string' || typeof cfg.weighing.meatRate !== 'string') {
          this.lockedWeighing.set(cfg.weighing);
        } else this.weighing.set({ fishEnabled: cfg.weighing.fishEnabled,
          fishRate: cfg.weighing.fishRate, meatEnabled: cfg.weighing.meatEnabled,
          meatRate: cfg.weighing.meatRate });
      } else if (cfg.weighing) { this.lockedWeighing.set(cfg.weighing); }
      const terminal = readTerminalSections(cfg.terminalSections);
      this.terminalChoices.set(terminal.choices);
      this.lockedTerminal.set(terminal.unreadable ? cfg.terminalSections : undefined);
      if (isEditableOperationsBlock(cfg.operations)) {
        const ops = readOperations(cfg.operations);
        this.operations.set(ops.states);
        this.preservedOperations.set(ops.preserved);
        this.operationsExtras = ops.extras;
      } else {
        this.lockedOperations.set(cfg.operations);
      }
      if (Array.isArray(cfg.facilities))
        this.facilities.set(
          cfg.facilities.map((f) => {
            const legacy = Array.isArray(f?.rateItems) ? f.rateItems : [];
            return {
              ...f,
              sections: normalizeSections(Array.isArray(f?.sections) ? f.sections : []),
              slaughterhouse:
                f.type === 'Per head'
                  ? f.slaughterhouse ?? migrateLegacySlaughterhouse(legacy)
                  : f.slaughterhouse,
            };
          }),
        );
      if (cfg.administrator)
        this.admin.set({
          name: cfg.administrator.name ?? '',
          position: cfg.administrator.position ?? '',
          email: cfg.administrator.email ?? '',
        });
      if (cfg.branding) {
        this.branding.set({
          officeName: cfg.branding.officeName ?? '',
          orPrefix: cfg.branding.orPrefix ?? '',
          orStart: cfg.branding.orStart ?? '',
          logoName: cfg.branding.logoName ?? '',
          logoDataUri: cfg.branding.logoDataUri ?? '',
        });
        if (cfg.branding.logoDataUri) this.logoPreview.set(cfg.branding.logoDataUri);
      }
    } catch {
      /* keep defaults on malformed config */
    }
  }

  catalogIcon(type: string): 'coins' | 'grid' | 'building' {
    return type === 'Per head' ? 'coins' : type === 'Weekly market' ? 'grid' : 'building';
  }
}
