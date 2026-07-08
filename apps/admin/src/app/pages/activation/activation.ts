import { Component, computed, inject, signal } from '@angular/core';
import { Icon } from '../../shared/icon/icon';
import { Config, Facility, RequestRecord, STATUS } from '../../core/demo';
import { AssessmentApi } from '../../core/assessment.api';
import { ActivationApi } from '../../core/activation.api';
import { mapRequestToCommand } from '../../core/activation.mapper';

const inScope = (r: RequestRecord): boolean => r.status === STATUS.APPROVED && r.stage === 'Activation';

interface WorkspaceConfig {
  facilities?: Facility[];
  administrator?: { name?: string; position?: string; email?: string };
  branding?: { officeName?: string; orPrefix?: string; orStart?: string; logoName?: string; logoDataUri?: string };
}

function parseWorkspaceConfig(json: string | null): WorkspaceConfig | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as WorkspaceConfig;
  } catch {
    return null;
  }
}

/** Project the workspace config into the console's Config shape for the summary + mapper. */
function toConfig(wc: WorkspaceConfig | null): Config {
  return {
    facilities: wc?.facilities ?? [],
    orSeries: `${wc?.branding?.orPrefix ?? ''}${wc?.branding?.orStart ?? ''}`,
    users: wc?.administrator
      ? [{ name: wc.administrator.name ?? '', role: 'Administrator (Super Admin)', email: wc.administrator.email ?? '' }]
      : [],
  };
}

function activationTemplate(m: string): string {
  return (
    `Congratulations! ${m}'s StallTrack portal is now live.\n\n` +
    'As the designated Administrator, please use the secure link below to set your password and sign in for the first time. ' +
    'Once inside, you can add and manage your own staff (admins and collectors) and begin day-to-day operations.\n\n' +
    '— StallTrack Platform Team'
  );
}

/**
 * Activation queue, backed by the live API. Lists requests in the Activation stage, loads each one's staged
 * draft config, maps it to the activation command, and commits it via POST /api/activation/municipality
 * (one-way). Requests whose municipality is already Active are shown as Live (the backend also guards against
 * double-activation). The operator reviews any mapping warnings and composes the email before committing.
 */
@Component({
  selector: 'app-activation',
  standalone: true,
  imports: [Icon],
  templateUrl: './activation.html',
})
export class Activation {
  private readonly api = inject(AssessmentApi);
  private readonly activationApi = inject(ActivationApi);

  readonly requests = signal<RequestRecord[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  private readonly activeMunis = signal<Set<string>>(new Set());
  private readonly configById = signal<Record<string, WorkspaceConfig | null>>({});

  readonly selectedId = signal<string | null>(null);

  readonly copied = signal(false);
  readonly composing = signal(false);
  readonly draft = signal('');
  readonly link = signal('');
  readonly activating = signal(false);
  readonly activateError = signal('');
  readonly warnings = signal<string[]>([]);

  readonly scoped = computed(() => this.requests().filter(inScope));
  readonly selected = computed<RequestRecord | null>(() => {
    const s = this.scoped();
    return s.find((r) => r.id === this.selectedId()) || s[0] || null;
  });

  readonly stats = computed(() => {
    const reqs = this.requests();
    const validation = reqs.filter((r) => r.status === STATUS.APPROVED && r.stage === 'Validation' && !r.activated).length;
    const activated = this.scoped().filter((r) => r.activated).length;
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

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    const munis = await this.api.listMunicipalities();
    const active = new Set((munis.ok ? munis.municipalities : []).filter((m) => m.isActive).map((m) => m.name.toLowerCase()));
    this.activeMunis.set(active);

    const res = await this.api.list();
    this.loading.set(false);
    if (!res.ok) {
      this.loadError.set(res.error);
      return;
    }
    this.requests.set(res.requests.map((r) => ({ ...r, activated: active.has(r.municipality.toLowerCase()) })));
    const first = this.scoped()[0];
    if (first) void this.loadConfig(first.id);
  }

  private upsert(record: RequestRecord): void {
    this.requests.update((rs) => rs.map((x) => (x.id === record.id ? record : x)));
  }

  private async loadConfig(id: string): Promise<void> {
    const r = this.requests().find((x) => x.id === id);
    if (!r || r.config) return;
    const res = await this.api.getDraftByRequest(id);
    if (res.ok) {
      const wc = parseWorkspaceConfig(res.draft.configJson);
      this.configById.update((m) => ({ ...m, [id]: wc }));
      this.upsert({ ...r, config: toConfig(wc) });
    }
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.composing.set(false);
    this.activateError.set('');
    void this.loadConfig(id);
  }

  beginActivate(): void {
    const r = this.selected();
    if (!r) return;
    this.activateError.set('');
    const wc = this.configById()[r.id];
    const { warnings } = mapRequestToCommand(r, { officeName: wc?.branding?.officeName });
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
      const wc = this.configById()[r.id];
      const { command } = mapRequestToCommand(r, { officeName: wc?.branding?.officeName, sealPath: wc?.branding?.logoDataUri });
      const res = await this.activationApi.activate(command);
      if (!res.ok) {
        this.activateError.set(res.error);
        return;
      }
      const headLink = `https://console.stalltrack.site/activate/${res.result.activationToken}`;
      this.link.set(headLink);
      this.activeMunis.update((s) => new Set(s).add(r.municipality.toLowerCase()));
      this.upsert({ ...r, activated: true, headActivationLink: headLink, headActivationMessage: this.draft() });
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
