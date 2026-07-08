import { Component, computed, effect, input, output, signal } from '@angular/core';
import { PolishedSelect } from '../polished-select/polished-select';

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
interface FacilitySection {
  id: string;
  name: string;
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
interface Facility {
  id: string;
  catalogKey: string;
  archetype: string;
  name: string;
  type: string;
  rateAmount: string;
  rateUnit: string;
  unitLabel: string;
  units: string;
  ordinance: string;
  notes: string;
  marketDay: string;
  sections: FacilitySection[];
  addOns: AddOn[];
  rateItems: RateItem[];
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

const FEE_UNITS = ['per month', 'per day', 'per kilo', 'per use', 'one-time'];
const FEE_MODES = ['Applies to all', 'Optional (per stall)'];
const FEE_BASIS = ['Per consumption', 'Fixed amount'];
// Utility add-ons are capped at these two presets (chosen from a fixed dropdown, not free text).
const FEE_NAMES = ['Electricity', 'Water'];
const MAX_ADDONS = FEE_NAMES.length;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CATALOG: CatalogItem[] = [
  { key: 'public_market', label: 'Public Market — daily stalls', type: 'Daily stall', unitLabel: 'stalls', archetype: 'DailyStall' },
  { key: 'commercial', label: 'Commercial Center / spaces — monthly rental', type: 'Monthly rental', unitLabel: 'spaces', archetype: 'MonthlyRental' },
  { key: 'barbecue', label: 'Barbecue / food stalls', type: 'Monthly rental', unitLabel: 'stalls', archetype: 'MonthlyRental' },
  { key: 'iceplant', label: 'Iceplant / cold storage', type: 'Monthly rental', unitLabel: 'units', archetype: 'MonthlyRental' },
  { key: 'slaughterhouse', label: 'Slaughterhouse — per head', type: 'Per head', unitLabel: 'heads', archetype: 'PerHead' },
  { key: 'terminal', label: 'Transport / Bus Terminal — per trip', type: 'Per trip', unitLabel: 'trips', archetype: 'PerTrip' },
  { key: 'weekly', label: 'Weekly / Tabo market — market day', type: 'Weekly market', unitLabel: 'vendors', archetype: 'WeeklyMarket' },
  { key: 'other', label: 'Other (custom facility)', type: 'Custom', unitLabel: 'units', archetype: 'Custom' },
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

// Fixed billing model + unit per facility type — shown as a read-only context line
// instead of asking operators to pick a billing type / unit label.
const CONTEXT_LINE: Record<string, string> = {
  'Daily stall': 'Daily stall · per stall',
  'Monthly rental': 'Monthly rental · per space',
  'Per head': 'Per head · per transaction',
  'Per trip': 'Per trip',
  'Weekly market': 'Weekly market · per vendor',
  Custom: 'Custom facility',
};
// Base-rate help text per facility type (only for types that keep a facility-level rate).
const RATE_HELP: Record<string, string> = {
  'Monthly rental': 'per month',
  'Per trip': 'per trip',
  'Weekly market': 'per vendor, per market day',
  Custom: 'per unit',
};

function facilityFrom(c: CatalogItem): Facility {
  return {
    id: uid(),
    catalogKey: c.key,
    archetype: c.archetype,
    name: c.key === 'other' ? '' : shortName(c.label),
    type: c.type,
    rateAmount: '',
    rateUnit: RATE_UNIT_FOR[c.type] || 'per month',
    unitLabel: c.unitLabel,
    units: '',
    ordinance: '',
    notes: '',
    marketDay: c.type === 'Weekly market' ? 'Friday' : '',
    sections: [],
    addOns: [],
    rateItems: [],
  };
}

@Component({
  selector: 'app-onboarding-workspace',
  standalone: true,
  imports: [PolishedSelect],
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
    'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-navy outline-none transition placeholder:text-muted/60 focus:border-gold focus:ring-2 focus:ring-gold/20';
  readonly MONEY_INPUT = this.INPUT + ' pl-7';
  readonly LABEL = 'block text-[11px] font-bold uppercase tracking-[0.1em] text-muted mb-1.5';

  readonly feeUnits = FEE_UNITS;
  readonly feeModes = FEE_MODES;
  readonly feeBasis = FEE_BASIS;
  readonly feeNames = FEE_NAMES;
  readonly maxAddOns = MAX_ADDONS;
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
    Boolean(this.branding().officeName.trim() && this.branding().orPrefix.trim()),
  );
  readonly sectionFlags = computed(() => [this.facilitiesDone(), this.adminDone(), this.brandingDone()]);
  readonly doneCount = computed(() => this.sectionFlags().filter(Boolean).length);
  readonly allDone = computed(() => this.doneCount() === this.sectionFlags().length);
  readonly pct = computed(() => Math.round((this.doneCount() / this.sectionFlags().length) * 100));

  isPerHead = (f: Facility): boolean => f.type === 'Per head';
  /** A market section is a "fish" section when its name mentions fish — those carry the per-kilo weighing fee. */
  isFishSection = (s: FacilitySection): boolean => /fish/i.test(s.name || '');
  /** Varied example placeholder per section row (Fish, Vegetables, Meat…) instead of always "Fish". */
  sectionNamePlaceholder(i: number): string {
    const examples = ['e.g. Fish', 'e.g. Vegetables', 'e.g. Meat', 'e.g. Dry goods', 'e.g. Rice'];
    return examples[i] ?? 'e.g. Section name';
  }
  /** Whether this facility keeps a single facility-level base rate (all types except Daily stall / Per head). */
  showBaseRate = (f: Facility): boolean => f.type !== 'Daily stall' && f.type !== 'Per head';
  isFacilityDone = (f: Facility): boolean => {
    if (!f.name.trim()) return false;
    if (f.type === 'Per head') return f.rateItems.some((r) => r.amount);
    if (f.type === 'Daily stall') return f.sections.some((s) => (s.rate || '').trim());
    return Boolean(f.rateAmount);
  };

  /** Read-only "billing model · unit" line shown under the facility name. */
  contextLine(f: Facility): string {
    return CONTEXT_LINE[f.type] || f.type;
  }
  /** Help text for the facility-level base rate (Monthly rental / Per trip / Weekly market / Custom). */
  rateHelpFor(type: string): string {
    return RATE_HELP[type] || 'per unit';
  }

  summaryFor(f: Facility): string {
    if (this.isPerHead(f)) {
      const n = f.rateItems.filter((r) => r.amount).length;
      return n ? `${n} animal type(s)` : '';
    }
    if (f.type === 'Daily stall') {
      const priced = f.sections.filter((s) => (s.rate || '').trim());
      if (!priced.length) return '';
      return priced.length === 1 ? `₱${priced[0].rate} per day` : `${priced.length} priced areas`;
    }
    return f.rateAmount ? `₱${f.rateAmount} ${f.rateUnit}` : '';
  }

  sectionTotal(f: Facility): number {
    return f.sections.reduce((s, x) => s + (parseInt(x.units, 10) || 0), 0);
  }

  ratePlaceholderFor(type: string): string {
    return this.ratePlaceholder[type] || '0';
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
  addFromCatalog(c: CatalogItem): void {
    const nf = facilityFrom(c);
    this.facilities.update((f) => [...f, nf]);
    this.expandedId.set(nf.id);
    this.picking.set(false);
  }
  toggleExpanded(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  // sections
  addSection(fid: string): void {
    this.mapFacility(fid, (x) => ({ ...x, sections: [...x.sections, { id: uid(), name: '', units: '', rate: '', fees: [] }] }));
  }
  removeSection(fid: string, sid: string): void {
    this.mapFacility(fid, (x) => ({ ...x, sections: x.sections.filter((s) => s.id !== sid) }));
  }
  setSection(fid: string, sid: string, key: keyof FacilitySection, val: string): void {
    this.mapFacility(fid, (x) => ({
      ...x,
      sections: x.sections.map((s) => {
        if (s.id !== sid) return s;
        const next: FacilitySection = { ...s, [key]: val };
        // The per-kilo weighing fee is shown only on Fish sections and is managed automatically:
        // naming a section "Fish" auto-adds the fee row; renaming away from fish removes it.
        if (key === 'name') {
          if (/fish/i.test(val)) {
            if (next.fees.length === 0) {
              next.fees = [{ id: uid(), label: 'Fish (per kilo)', amount: '', unit: 'per kilo' }];
            }
          } else {
            next.fees = [];
          }
        }
        return next;
      }),
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

  // rate items (per-head animal types)
  addRateItem(fid: string): void {
    this.mapFacility(fid, (x) => ({ ...x, rateItems: [...x.rateItems, { id: uid(), label: '', amount: '' }] }));
  }
  removeRateItem(fid: string, rid: string): void {
    this.mapFacility(fid, (x) => ({ ...x, rateItems: x.rateItems.filter((r) => r.id !== rid) }));
  }
  setRateItem(fid: string, rid: string, key: keyof RateItem, val: string): void {
    this.mapFacility(fid, (x) => ({
      ...x,
      rateItems: x.rateItems.map((r) => (r.id === rid ? { ...r, [key]: val } : r)),
    }));
  }

  // facility-level fees
  addFee(fid: string): void {
    this.mapFacility(fid, (x) => {
      // Utilities are capped at the fixed presets (Electricity / Water) and picked from a dropdown.
      if (x.addOns.length >= MAX_ADDONS) return x;
      const used = new Set(x.addOns.map((a) => a.label));
      const label = FEE_NAMES.find((n) => !used.has(n)) ?? FEE_NAMES[0];
      return {
        ...x,
        addOns: [...x.addOns, { id: uid(), label, basis: 'Per consumption', amount: '', unit: 'per month', mode: 'Optional (per stall)' }],
      };
    });
  }
  removeFee(fid: string, feeId: string): void {
    this.mapFacility(fid, (x) => ({ ...x, addOns: x.addOns.filter((a) => a.id !== feeId) }));
  }
  setFee(fid: string, feeId: string, key: keyof AddOn, val: string): void {
    this.mapFacility(fid, (x) => ({
      ...x,
      addOns: x.addOns.map((a) => (a.id === feeId ? { ...a, [key]: val } : a)),
    }));
  }

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
    if (this.allDone()) this.submitDraft.emit(this.serialize());
  }
  editSubmission(): void {
    this.edit.emit();
  }
  saveProgress(): void {
    this.saveDraft.emit(this.serialize());
  }

  private serialize(): string {
    return JSON.stringify({ facilities: this.facilities(), administrator: this.admin(), branding: this.branding() });
  }

  private hydrate(json: string): void {
    try {
      const cfg = JSON.parse(json) as {
        facilities?: Facility[];
        administrator?: { name?: string; position?: string; email?: string };
        branding?: { officeName?: string; orPrefix?: string; orStart?: string; logoName?: string; logoDataUri?: string };
      };
      if (Array.isArray(cfg.facilities)) this.facilities.set(cfg.facilities);
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
