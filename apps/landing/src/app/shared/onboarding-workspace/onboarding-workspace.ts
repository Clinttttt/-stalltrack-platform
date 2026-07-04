import { Component, computed, input, signal } from '@angular/core';
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

const BILLING_TYPES = ['Daily stall', 'Monthly rental', 'Weekly market', 'Per trip', 'Per head', 'Custom'];
const RATE_UNITS = ['per day', 'per month', 'per trip', 'per head', 'per vendor', 'per kilo'];
const FEE_UNITS = ['per month', 'per day', 'per kilo', 'per use', 'one-time'];
const FEE_MODES = ['Applies to all', 'Optional (per stall)'];
const FEE_BASIS = ['Per consumption', 'Fixed amount'];

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

  // Design-system class strings (mirror the React module constants).
  readonly INPUT =
    'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-navy outline-none transition placeholder:text-muted/60 focus:border-gold focus:ring-2 focus:ring-gold/20';
  readonly MONEY_INPUT = this.INPUT + ' pl-7';
  readonly LABEL = 'block text-[11px] font-bold uppercase tracking-[0.1em] text-muted mb-1.5';

  readonly billingTypes = BILLING_TYPES;
  readonly rateUnits = RATE_UNITS;
  readonly feeUnits = FEE_UNITS;
  readonly feeModes = FEE_MODES;
  readonly feeBasis = FEE_BASIS;
  readonly catalog = CATALOG;
  readonly ratePlaceholder = RATE_PLACEHOLDER;

  readonly facilities = signal<Facility[]>([
    {
      ...facilityFrom(CATALOG[0]),
      rateAmount: '30',
      sections: [
        { id: uid(), name: 'Fish', units: '40', fees: [{ id: uid(), label: 'Fish (per kilo)', amount: '1', unit: 'per kilo' }] },
        { id: uid(), name: 'Meat', units: '30', fees: [] },
        { id: uid(), name: 'Vegetables', units: '50', fees: [] },
      ],
      addOns: [
        { id: uid(), label: 'Electricity', basis: 'Per consumption', amount: '', unit: 'per month', mode: 'Optional (per stall)' },
        { id: uid(), label: 'Water', basis: 'Per consumption', amount: '', unit: 'per month', mode: 'Optional (per stall)' },
      ],
    },
    {
      ...facilityFrom(CATALOG[4]),
      rateItems: [
        { id: uid(), label: 'Hog', amount: '250' },
        { id: uid(), label: 'Cattle / Carabao', amount: '365' },
      ],
    },
    facilityFrom(CATALOG[6]),
  ]);

  readonly expandedId = signal<string | null>(null);
  readonly picking = signal(false);
  readonly admin = signal({ name: '', position: '', email: '' });
  readonly branding = signal({ officeName: '', orPrefix: '', orStart: '', logoName: '' });
  readonly logoPreview = signal('');
  readonly submitted = signal(false);

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
  isFacilityDone = (f: Facility): boolean =>
    Boolean(f.name.trim() && (this.isPerHead(f) ? f.rateItems.some((r) => r.amount) : f.rateAmount));

  summaryFor(f: Facility): string {
    if (this.isPerHead(f)) {
      const n = f.rateItems.filter((r) => r.amount).length;
      return n ? `${n} animal type(s)` : '';
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
    this.mapFacility(fid, (x) => ({ ...x, sections: [...x.sections, { id: uid(), name: '', units: '', fees: [] }] }));
  }
  removeSection(fid: string, sid: string): void {
    this.mapFacility(fid, (x) => ({ ...x, sections: x.sections.filter((s) => s.id !== sid) }));
  }
  setSection(fid: string, sid: string, key: keyof FacilitySection, val: string): void {
    this.mapFacility(fid, (x) => ({
      ...x,
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
    this.mapFacility(fid, (x) => ({
      ...x,
      addOns: [...x.addOns, { id: uid(), label: '', basis: 'Per consumption', amount: '', unit: 'per month', mode: 'Optional (per stall)' }],
    }));
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
  setBranding(key: 'officeName' | 'orPrefix' | 'orStart' | 'logoName', val: string): void {
    this.branding.update((b) => ({ ...b, [key]: val }));
  }
  onLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.setBranding('logoName', file.name);
    this.logoPreview.set(URL.createObjectURL(file));
  }

  submit(): void {
    if (this.allDone()) this.submitted.set(true);
  }
  editSubmission(): void {
    this.submitted.set(false);
  }

  catalogIcon(type: string): 'coins' | 'grid' | 'building' {
    return type === 'Per head' ? 'coins' : type === 'Weekly market' ? 'grid' : 'building';
  }
}
