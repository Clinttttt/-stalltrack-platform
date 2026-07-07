import { Component, computed, inject, signal } from '@angular/core';
import { Icon } from '../../shared/icon/icon';
import { AssessmentApi } from '../../core/assessment.api';
import { fmtLog } from '../../core/format';
import {
  CHAT_TEMPLATES,
  RequestRecord,
  STAGES,
  STATUS,
  approvalTemplate,
  declineTemplate,
  makeLink,
  statusLabel,
  statusTone,
} from '../../core/demo';

const TABS = ['Pending', 'Onboarding', 'Declined', 'All'];
const TONE: Record<'amber' | 'green' | 'red', string> = {
  amber: 'bg-amber-bg text-amber',
  green: 'bg-green-bg text-green',
  red: 'bg-red-bg text-red',
};

// This page handles the Assessment + Onboarding stages only. Validation/Activation
// stages live on their own pages.
const inScope = (r: RequestRecord): boolean =>
  r.status === STATUS.PENDING ||
  r.status === STATUS.DECLINED ||
  (r.status === STATUS.APPROVED && r.stage === 'Onboarding' && !r.activated);

const TAB_FILTER: Record<string, (r: RequestRecord) => boolean> = {
  Pending: (r) => r.status === STATUS.PENDING,
  Onboarding: (r) => r.status === STATUS.APPROVED && r.stage === 'Onboarding',
  Declined: (r) => r.status === STATUS.DECLINED,
  All: () => true,
};

interface Compose {
  mode: 'approve' | 'decline' | null;
  draft: string;
  link: string;
}

/**
 * Assessment + Onboarding review, backed by the live API (GET/approve/decline
 * /api/assessment/requests). Downstream stages (validation/activation) and the rich
 * onboarding config/chat are not backed yet, so a real approved request advances to the
 * Onboarding stage but its config is entered later; the LGU-response timeline/messages
 * render in their "awaiting" state until those staging endpoints land.
 */
@Component({
  selector: 'app-console',
  standalone: true,
  imports: [Icon],
  templateUrl: './console.html',
})
export class Console {
  private readonly api = inject(AssessmentApi);

  // Expose helpers/constants to the template.
  readonly TABS = TABS;
  readonly TONE = TONE;
  readonly STATUS = STATUS;
  readonly STAGES = STAGES;
  readonly CHAT_TEMPLATES = CHAT_TEMPLATES;
  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;
  readonly fmtLog = fmtLog;

  readonly requests = signal<RequestRecord[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');

  readonly selectedId = signal<string | null>(null);
  readonly tab = signal<string>('Pending');
  readonly compose = signal<Compose>({ mode: null, draft: '', link: '' });
  readonly chatDraft = signal('');
  readonly copied = signal(false);
  readonly busy = signal(false);

  readonly scoped = computed(() => this.requests().filter(inScope));
  readonly filtered = computed(() => this.scoped().filter(TAB_FILTER[this.tab()]));
  readonly selected = computed(() => this.scoped().find((r) => r.id === this.selectedId()) || null);

  readonly stats = computed(() => [
    { label: 'Total requests', value: this.requests().length },
    { label: 'Pending review', value: this.count('Pending') },
    { label: 'Onboarding', value: this.count('Onboarding') },
    { label: 'Declined', value: this.count('Declined') },
  ]);

  readonly fields = computed<Array<[string, string]>>(() => {
    const r = this.selected();
    if (!r) return [];
    return [
      ['Municipality', r.municipality],
      ['Province', r.province],
      ['Facilities managed', r.facilitiesManaged],
      ['Requesting office', r.requestingOffice],
      ['Focal person', r.focalPerson],
      ['Position', r.position],
      ['Official email', r.officialEmail],
      ['Contact number', r.contactNumber],
      ['Approx. vendors', r.approxVendors],
      ['Authorization status', r.authorizationStatus],
      ['Acknowledged', r.acknowledged ? 'Confirmed' : ''],
      ['Notes', r.notes || ''],
    ];
  });

  readonly stageIndex = computed(() => {
    const r = this.selected();
    return r ? STAGES.indexOf(r.stage as (typeof STAGES)[number]) : -1;
  });

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    const result = await this.api.list();
    this.loading.set(false);
    if (result.ok) this.requests.set(result.requests);
    else this.loadError.set(result.error);
  }

  private upsert(record: RequestRecord): void {
    this.requests.update((rs) => rs.map((r) => (r.id === record.id ? record : r)));
  }

  count(t: string): number {
    return this.scoped().filter(TAB_FILTER[t]).length;
  }

  setTab(t: string): void {
    this.tab.set(t);
  }

  select(r: RequestRecord): void {
    this.selectedId.set(r.id);
    this.compose.set({ mode: null, draft: '', link: '' });
    this.chatDraft.set('');
    this.copied.set(false);
    this.actionError.set('');
  }

  beginApprove(): void {
    const s = this.selected();
    if (!s) return;
    this.actionError.set('');
    this.compose.set({ mode: 'approve', draft: approvalTemplate(s.municipality), link: makeLink(s.municipality) });
  }
  beginDecline(): void {
    const s = this.selected();
    if (!s) return;
    this.actionError.set('');
    this.compose.set({ mode: 'decline', draft: declineTemplate(s.municipality), link: '' });
  }
  cancelCompose(): void {
    this.compose.set({ mode: null, draft: '', link: '' });
  }
  setDraft(value: string): void {
    this.compose.update((c) => ({ ...c, draft: value }));
  }

  async confirmApprove(): Promise<void> {
    const s = this.selected();
    const c = this.compose();
    if (!s || !c.draft.trim() || this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    const result = await this.api.approve(s.id, c.link, c.draft);
    this.busy.set(false);
    if (!result.ok) {
      this.actionError.set(result.error);
      return;
    }
    this.upsert(result.request);
    this.cancelCompose();
    this.setTab('Onboarding');
  }

  async confirmDecline(): Promise<void> {
    const s = this.selected();
    const c = this.compose();
    if (!s || !c.draft.trim() || this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    const result = await this.api.decline(s.id, c.draft);
    this.busy.set(false);
    if (!result.ok) {
      this.actionError.set(result.error);
      return;
    }
    this.upsert(result.request);
    this.cancelCompose();
    this.setTab('Declined');
  }

  // Onboarding → Validation requires the onboarding-staging backend (future stage). The button is
  // disabled for backend-backed requests (no lguSubmittedForValidation), so this is a safe stub.
  sendToValidation(_r: RequestRecord): void {
    /* future stage */
  }

  async copyLink(r: RequestRecord): Promise<void> {
    try {
      await navigator.clipboard.writeText(r.onboardingLink);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  setChatFromTemplate(text: string): void {
    this.chatDraft.set(text);
  }

  // Messaging is not persisted yet (no backend) — kept as an in-session note on the local record.
  sendChat(r: RequestRecord): void {
    const draft = this.chatDraft();
    if (!draft.trim()) return;
    const updated: RequestRecord = { ...r, log: [...r.log, { at: new Date().toISOString(), text: draft.trim() }] };
    this.upsert(updated);
    this.chatDraft.set('');
  }
}
