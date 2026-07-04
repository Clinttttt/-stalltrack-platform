import { Component, computed, inject, signal } from '@angular/core';
import { Icon } from '../../shared/icon/icon';
import { DemoStore } from '../../core/demo-store.service';
import { fmtLog } from '../../core/format';
import { Facility, Fee, RequestRecord, STATUS } from '../../core/demo';

const inScope = (r: RequestRecord): boolean =>
  r.status === STATUS.APPROVED && r.stage === 'Validation' && !r.activated;

/**
 * Faithful Angular port of the React apps/admin/src/pages/Validation.jsx.
 * Lists municipalities awaiting validation and renders the configuration dry-run (KPIs,
 * per-facility rate/section/add-on breakdown, branding + users) with approve/return
 * actions. The React <DryRun> subcomponent is inlined into this component's template.
 */
@Component({
  selector: 'app-validation',
  standalone: true,
  imports: [Icon],
  templateUrl: './validation.html',
})
export class Validation {
  readonly store = inject(DemoStore);
  readonly fmtLog = fmtLog;

  readonly selectedId = signal<string | null>(null);

  readonly scoped = computed(() => this.store.requests().filter(inScope));
  readonly selected = computed<RequestRecord | null>(() => {
    const s = this.scoped();
    return s.find((r) => r.id === this.selectedId()) || s[0] || null;
  });

  readonly stats = computed(() => {
    const reqs = this.store.requests();
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
  }
}
