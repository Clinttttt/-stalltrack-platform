import { TERMINAL_LABELS } from '@stalltrack/terminal-config';
import { Component, computed, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { Icon } from '../../shared/icon/icon';
import { Sensitive } from '../../shared/privacy/sensitive';
import { PrivacyService } from '../../shared/privacy/privacy.service';
import { AssessmentApi } from '../../core/assessment.api';
import { fmtLog } from '../../core/format';
import { Facility, Fee, RequestRecord, STATUS, Section } from '../../core/demo';
import { marketSectionLabelOf } from '../../core/market-sections';
import { ActivationApi } from '../../core/activation.api';
import { mapRequestToCommand } from '../../core/activation.mapper';
import { parseWorkspaceConfig, toReviewConfig } from '../../core/onboarding-config';
import { declaredRows, OperationGroup } from '../../core/onboarding-operations';
import { installStageFreshness } from '../../core/stage-freshness';

const inScope = (r: RequestRecord): boolean =>
  r.status === STATUS.APPROVED && r.stage === 'Validation' && !r.activated;

/** The four groups of the declared-operations list, in the order the office's own income statement uses. */
const OPERATION_GROUP_ORDER: ReadonlyArray<{ key: OperationGroup; label: string }> = [
  { key: 'market', label: 'Market collections' },
  { key: 'utility', label: 'Utilities' },
  { key: 'space', label: 'Spaces & rentals' },
  { key: 'other', label: 'Other enterprise operations' },
];

/**
 * Validation dry-run, backed by the live API. Lists requests in the Validation stage, loads each one's
 * submitted onboarding draft config for review, and approves (→ Activation) or returns (→ Onboarding).
 *
 * Sensitive submitted values (rates, fees, rent, e-mail addresses) are held back until the reviewer asks for them, for ONE
 * request at a time (see PrivacyService). That is a privacy aid for shared screens, not access control: this page and the
 * endpoints behind it are reachable by the platform operator only, and nothing here grants a permission.
 */
@Component({
  selector: 'app-validation',
  standalone: true,
  imports: [Icon, Sensitive],
  templateUrl: './validation.html',
})
export class Validation {
  private readonly api = inject(AssessmentApi);
  private readonly activationApi = inject(ActivationApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly privacy = inject(PrivacyService);
  readonly fmtLog = fmtLog;

  readonly requests = signal<RequestRecord[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly busy = signal(false);
  /** Set when the reviewer pressed Approve while amounts were still hidden; asks once before going on. */
  readonly confirmHidden = signal(false);

  readonly selectedId = signal<string | null>(null);

  readonly scoped = computed(() => this.requests().filter(inScope));
  readonly selected = computed<RequestRecord | null>(() => {
    const s = this.scoped();
    return s.find((r) => r.id === this.selectedId()) || s[0] || null;
  });

  /** Whether the sensitive values of the request on screen are showing. */
  readonly revealed = computed(() => this.privacy.isRevealed(this.selected()?.id));

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

  /** The revenue operations the office declared. Initial intent only: each is set up in the Head Portal after activation. */
  readonly declaredOperations = computed(() => declaredRows(this.selected()?.config?.operations));
  /** The same rows split by the group of the income statement they belong to; empty groups are left out. */
  readonly operationGroups = computed(() => {
    const rows = this.declaredOperations();
    return OPERATION_GROUP_ORDER.map((g) => ({ label: g.label, rows: rows.filter((o) => o.group === g.key) })).filter((g) => g.rows.length > 0);
  });
  readonly operationProblems = computed(() => this.selected()?.config?.operationProblems ?? []);
  readonly terminalLabels = TERMINAL_LABELS;
  readonly terminalSections = computed(() => this.selected()?.config?.terminalSections ?? []);
  readonly terminalSectionsUnreadable = computed(() => this.selected()?.config?.terminalSectionsUnreadable === true);

  /** Whether this configuration holds any value that is hidden until revealed. */
  readonly hasSensitive = computed(() => {
    const cfg = this.selected()?.config;
    if (!cfg) return false;
    const rates = this.facilities().some(
      (f) =>
        !!f.rateAmount ||
        !!f.monthlyRent ||
        !!f.slaughterhouse ||
        (f.rateItems?.length ?? 0) > 0 ||
        (f.addOns ?? []).some((a) => !!a.amount) ||
        (f.sections ?? []).some((s) => !!s.rate || (s.fees?.length ?? 0) > 0),
    );
    return rates || !!(cfg.weighing?.fishEnabled || cfg.weighing?.meatEnabled) || (cfg.users ?? []).some((u) => !!u.email);
  });

  readonly kpis = computed(() => {
    const facilities = this.facilities();
    const totalUnits = facilities.reduce((sum, f) => sum + (this.spaceBased(f) ? this.facUnits(f) : 0), 0);
    const rateFeeCount = facilities.reduce((s, f) => {
      const base = f.type !== 'Per head' && f.rateAmount ? 1 : 0;
      const secFees = (f.sections || []).reduce((n, x) => n + (x.rate ? 1 : 0) + (x.fees?.length || 0), 0);
      const animalRates = f.slaughterhouse
        ? 2 + (f.slaughterhouse.customAnimals?.length || 0)
        : (f.rateItems?.length || 0);
      return s + base + secFees + (f.addOns?.length || 0) + animalRates;
    }, 0);
    const collectionModels = new Set(facilities.map((f) => f.type)).size;
    return [
      { label: 'Facilities', value: facilities.length },
      { label: 'Spaces', value: totalUnits },
      { label: 'Rates & fees', value: rateFeeCount },
      { label: 'Collection models', value: collectionModels },
    ];
  });

  constructor() {
    void this.refresh();
    installStageFreshness(this.destroyRef, () => this.refresh(false));
    // Whatever was revealed is hidden again when the reviewer leaves this page.
    this.destroyRef.onDestroy(() => this.privacy.hide());
  }

  /** Details are hidden the moment the tab is no longer in front: a reviewer who switches away should not return to open amounts. */
  @HostListener('document:visibilitychange')
  onVisibility(): void {
    if (typeof document !== 'undefined' && document.hidden) this.privacy.hide();
  }

  /** Activity on the page keeps revealed details from timing out under someone who is still reading them. */
  @HostListener('click')
  @HostListener('keydown')
  onActivity(): void {
    this.privacy.touch();
  }

  async refresh(showLoading = true): Promise<void> {
    if (showLoading) this.loading.set(true);
    this.loadError.set('');
    const res = await this.api.list();
    if (showLoading) this.loading.set(false);
    if (res.ok) {
      const loaded = new Map(this.requests().filter((r) => r.config).map((r) => [r.id, r.config]));
      this.requests.set(res.requests.map((r) => ({ ...r, config: loaded.get(r.id) })));
      const target = this.selected();
      if (target) void this.loadConfig(target.id);
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
    if (res.ok) this.upsert({ ...r, config: toReviewConfig(parseWorkspaceConfig(res.draft.configJson)) });
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
  /** Which collection area of the daily sheet a section stands for, for the operator's review. */
  areaLabel(s: Section): string {
    return marketSectionLabelOf(s.kind);
  }

  select(id: string): void {
    // Switching request always hides again: what was revealed belonged to the one before.
    this.privacy.hide();
    this.confirmHidden.set(false);
    this.selectedId.set(id);
    this.actionError.set('');
    void this.loadConfig(id);
  }

  revealDetails(): void {
    const r = this.selected();
    if (r) this.privacy.reveal(r.id);
    this.confirmHidden.set(false);
  }

  hideDetails(): void {
    this.privacy.hide();
  }

  togglePrivacyMode(): void {
    this.privacy.setPrivacyMode(!this.privacy.privacyMode());
  }

  /**
   * Approve is where a hidden amount could be waved through, so it asks once. A reviewer who has revealed the details, or whose
   * configuration holds nothing hidden, goes straight on.
   */
  requestApprove(r: RequestRecord): void {
    if (!this.revealed() && this.hasSensitive() && !this.confirmHidden()) {
      this.confirmHidden.set(true);
      return;
    }
    this.confirmHidden.set(false);
    void this.approveValidation(r);
  }

  async approveValidation(r: RequestRecord): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    const mapped = mapRequestToCommand(r, { officeName: r.config?.officeName });
    if (mapped.blockingErrors.length) {
      this.actionError.set(mapped.blockingErrors.join(' '));
      this.busy.set(false);
      return;
    }
    const preflight = await this.activationApi.preflight(mapped.command);
    if (!preflight.ok) {
      this.actionError.set(preflight.error);
      this.busy.set(false);
      return;
    }
    const res = await this.api.approveValidation(r.id);
    this.busy.set(false);
    if (res.ok) {
      this.privacy.hide();
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
      this.privacy.hide();
      this.upsert(res.request); // now stage=Onboarding → leaves the validation queue
      this.selectedId.set(null);
    } else {
      this.actionError.set(res.error);
    }
  }
}
