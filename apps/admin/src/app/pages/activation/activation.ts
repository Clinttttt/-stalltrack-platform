import { Component, computed, inject, signal } from '@angular/core';
import { Icon } from '../../shared/icon/icon';
import { DemoStore } from '../../core/demo-store.service';
import { Facility, RequestRecord, STATUS } from '../../core/demo';
import { ActivationApi } from '../../core/activation.api';
import { mapRequestToCommand } from '../../core/activation.mapper';

const inScope = (r: RequestRecord): boolean => r.status === STATUS.APPROVED && r.stage === 'Activation';

function activationTemplate(m: string): string {
  return (
    `Congratulations! ${m}'s StallTrack portal is now live.\n\n` +
    'As the designated Administrator, please use the secure link below to set your password and sign in for the first time. ' +
    'Once inside, you can add and manage your own staff (admins and collectors) and begin day-to-day operations.\n\n' +
    '— StallTrack Platform Team'
  );
}

/**
 * Faithful Angular port of the React apps/admin/src/pages/Activation.jsx.
 * Activation queue + detail: provision summary, accounts to provision, and the activation
 * correspondence composer / live confirmation. The React <ActivationDetail> subcomponent is
 * inlined into this component's template.
 */
@Component({
  selector: 'app-activation',
  standalone: true,
  imports: [Icon],
  templateUrl: './activation.html',
})
export class Activation {
  readonly store = inject(DemoStore);
  private readonly activationApi = inject(ActivationApi);

  readonly selectedId = signal<string | null>(null);

  // Detail-local state (mirrors the React ActivationDetail component state).
  readonly copied = signal(false);
  readonly composing = signal(false);
  readonly draft = signal('');
  readonly link = signal('');
  // Live-activation state.
  readonly activating = signal(false);
  readonly activateError = signal('');
  readonly warnings = signal<string[]>([]);

  readonly scoped = computed(() => this.store.requests().filter(inScope));
  readonly selected = computed<RequestRecord | null>(() => {
    const s = this.scoped();
    return s.find((r) => r.id === this.selectedId()) || s[0] || null;
  });

  readonly stats = computed(() => {
    const reqs = this.store.requests();
    const validation = reqs.filter((r) => r.status === STATUS.APPROVED && r.stage === 'Validation' && !r.activated).length;
    const activated = reqs.filter((r) => r.activated).length;
    return [
      { label: 'In validation', value: validation },
      { label: 'Ready to activate', value: this.scoped().filter((r) => !r.activated).length },
      { label: 'Activated', value: activated },
      { label: 'Total requests', value: reqs.length },
    ];
  });

  readonly users = computed(() => this.selected()?.config?.users ?? []);
  readonly facilities = computed<Facility[]>(() => this.selected()?.config?.facilities ?? []);

  readonly totalUnits = computed(() =>
    this.facilities().reduce((s, f) => s + (this.spaceBased(f) ? this.facUnits(f) : 0), 0),
  );
  readonly rateFeeCount = computed(() =>
    this.facilities().reduce((s, f) => {
      const base = f.type !== 'Per head' && f.rateAmount ? 1 : 0;
      const secFees = (f.sections || []).reduce((n, x) => n + (x.fees?.length || 0), 0);
      return s + base + secFees + (f.addOns?.length || 0) + (f.rateItems?.length || 0);
    }, 0),
  );
  readonly collectionModels = computed(() => new Set(this.facilities().map((f) => f.type)).size);
  readonly headEmail = computed(() => {
    const users = this.users();
    return (users.find((u) => /admin/i.test(u.role)) || users[0])?.email || '';
  });

  facUnits(f: Facility): number {
    return f.sections?.length
      ? f.sections.reduce((s, x) => s + (parseInt(x.units, 10) || 0), 0)
      : parseInt(f.units, 10) || 0;
  }
  spaceBased(f: Facility): boolean {
    return f.type === 'Daily stall' || f.type === 'Monthly rental' || (f.sections?.length ?? 0) > 0;
  }

  select(id: string): void {
    this.selectedId.set(id);
  }

  beginActivate(): void {
    const r = this.selected();
    if (!r) return;
    this.activateError.set('');
    // Compute the mapping now so the operator sees any warnings before committing.
    // The real activation link only exists after the API returns its one-time token.
    const { warnings } = mapRequestToCommand(r);
    this.warnings.set(warnings);
    this.link.set('');
    this.draft.set(activationTemplate(r.municipality));
    this.composing.set(true);
  }

  async confirmActivate(): Promise<void> {
    const r = this.selected();
    if (!r || !this.draft().trim() || this.activating()) return;
    if (!r.config?.facilities?.length) {
      this.activateError.set('This municipality has no configured facilities to activate.');
      return;
    }
    this.activating.set(true);
    this.activateError.set('');
    try {
      const { command } = mapRequestToCommand(r);
      const res = await this.activationApi.activate(command);
      if (!res.ok) {
        this.activateError.set(res.error);
        return;
      }
      // Build the Head's set-password link from the one-time token returned by the API.
      const headLink = `https://console.stalltrack.site/activate/${res.result.activationToken}`;
      this.link.set(headLink);
      this.store.activate(r.id, headLink, this.draft());
      this.composing.set(false);
    } finally {
      this.activating.set(false);
    }
  }

  cancelComposing(): void {
    this.composing.set(false);
    this.activateError.set('');
  }

  async copyLink(): Promise<void> {
    const r = this.selected();
    if (!r) return;
    try {
      await navigator.clipboard.writeText(r.headActivationLink || '');
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    } catch {
      /* ignore */
    }
  }
}
