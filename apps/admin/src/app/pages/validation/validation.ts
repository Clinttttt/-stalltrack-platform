import { Component, computed, inject, signal } from '@angular/core';
import { Icon } from '../../shared/icon/icon';
import { AssessmentApi } from '../../core/assessment.api';
import { fmtLog } from '../../core/format';
import { Config, Facility, Fee, RequestRecord, STATUS } from '../../core/demo';

const inScope = (r: RequestRecord): boolean =>
  r.status === STATUS.APPROVED && r.stage === 'Validation' && !r.activated;

/** Parse the workspace's opaque config document into the console's Config shape. */
function parseConfig(json: string | null): Config {
  if (!json) return { facilities: [], orSeries: '', users: [] };
  try {
    const c = JSON.parse(json) as {
      facilities?: Facility[];
      administrator?: { name?: string; email?: string };
      branding?: { orPrefix?: string };
    };
    return {
      facilities: Array.isArray(c.facilities) ? c.facilities : [],
      orSeries: c.branding?.orPrefix ?? '',
      users: c.administrator
        ? [{ name: c.administrator.name ?? '', role: 'Administrator (Super Admin)', email: c.administrator.email ?? '' }]
        : [],
    };
  } catch {
    return { facilities: [], orSeries: '', users: [] };
  }
}

/**
 * Validation dry-run, backed by the live API. Lists requests in the Validation stage, loads each one's
 * submitted onboarding draft config for review, and approves (→ Activation) or returns (→ Onboarding).
 */
@Component({
  selector: 'app-validation',
  standalone: true,
  imports: [Icon],
  templateUrl: './validation.html',
})
export class Validation {
  private readonly api = inject(AssessmentApi);
  readonly fmtLog = fmtLog;

  readonly requests = signal<RequestRecord[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly busy = signal(false);

  readonly selectedId = signal<string | null>(null);

  readonly scoped = computed(() => this.requests().filter(inScope));
  readonly selected = computed<RequestRecord | null>(() => {
    const s = this.scoped();
    return s.find((r) => r.id === this.selectedId()) || s[0] || null;
  });

  readonly stats = computed(() => {
    const reqs = this.requests();
    const onboarding = reqs.filter((r) => r.status === STATUS.APPROVED && r.stage === 'Onboarding' && !r.activated).length;
    const activation = reqs.filter((r) => r.status === STATUS.APPROVED && r.stage === 'Activation').length;
    return [
      { label: 'In onboarding', value: onboarding },
      { label: 'In validation', value: this.scoped().length },
      { label: 'In activation', value: activation },
      { label: 'Total requests', value: reqs.length },
    ];
  });

  readonly facilities = computed<Facility[]>(() => this.selected()?.config?.facilities ?? []);

  readonly kpis = computed(() => {
    const facilities = this.facilities();
    const totalUnits = facilities.reduce((sum, f) => sum + (this.spaceBased(f) ? this.facUnits(f) : 0), 0);
    const rateFeeCount = facilities.reduce((s, f) => {
      const base = f.type !== 'Per head' && f.rateAmount ? 1 : 0;
      const secFees = (f.sections || []).reduce((n, x) => n + (x.fees?.length || 0), 0);
      return s + base + secFees + (f.addOns?.length || 0) + (f.rateItems?.length || 0);
    }, 0);
    const collectionModels = new Set(facilities.map((f) => f.type)).size;
    return [
      { label: 'Facilities', value: facilities.length },
      { label: 'Total units', value: totalUnits },
      { label: 'Rates & fees', value: rateFeeCount },
      { label: 'Collection models', value: collectionModels },
    ];
  });

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    const res = await this.api.list();
    this.loading.set(false);
    if (res.ok) {
      this.requests.set(res.requests);
      const first = this.scoped()[0];
      if (first) void this.loadConfig(first.id);
    } else {
      this.loadError.set(res.error);
    }
  }

  private upsert(record: RequestRecord): void {
    this.requests.update((rs) => rs.map((x) => (x.id === record.id ? record : x)));
  }

  private async loadConfig(id: string): Promise<void> {
    const r = this.requests().find((x) => x.id === id);
    if (!r || r.config) return;
    const res = await this.api.getDraftByRequest(id);
    if (res.ok) this.upsert({ ...r, config: parseConfig(res.draft.configJson) });
  }

  facUnits(f: Facility): number {
    return f.sections?.length
      ? f.sections.reduce((s, x) => s + (parseInt(x.units, 10) || 0), 0)
      : parseInt(f.units, 10) || 0;
  }
  spaceBased(f: Facility): boolean {
    return f.type === 'Daily stall' || f.type === 'Monthly rental' || (f.sections?.length ?? 0) > 0;
  }
  feesText(fees: Fee[]): string {
    return fees.map((z) => `${z.label} ₱${z.amount} ${z.unit}`).join(', ');
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.actionError.set('');
    void this.loadConfig(id);
  }

  async approveValidation(r: RequestRecord): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    const res = await this.api.approveValidation(r.id);
    this.busy.set(false);
    if (res.ok) {
      this.upsert(res.request); // now stage=Activation → leaves the validation queue
      this.selectedId.set(null);
    } else {
      this.actionError.set(res.error);
    }
  }

  async returnToOnboarding(r: RequestRecord): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    const res = await this.api.returnToOnboarding(r.id, 'Please review the noted items and resubmit for validation.');
    this.busy.set(false);
    if (res.ok) {
      this.upsert(res.request); // now stage=Onboarding → leaves the validation queue
      this.selectedId.set(null);
    } else {
      this.actionError.set(res.error);
    }
  }
}
