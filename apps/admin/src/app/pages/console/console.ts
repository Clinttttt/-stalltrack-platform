import { Component, computed, inject, signal } from '@angular/core';
import { Icon } from '../../shared/icon/icon';
import { DemoStore } from '../../core/demo-store.service';
import { fmtLog } from '../../core/format';
import {
  CHAT_TEMPLATES,
  RequestRecord,
  RequestStatus,
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
 * Faithful Angular port of the React apps/admin/src/pages/Console.jsx.
 * Handles the Assessment + Onboarding stages: request list (tabbed) + detail panel with
 * approve/decline correspondence composer and the private onboarding room. The React
 * <Detail> subcomponent is inlined into this component's template.
 */
@Component({
  selector: 'app-console',
  standalone: true,
  imports: [Icon],
  templateUrl: './console.html',
})
export class Console {
  readonly store = inject(DemoStore);

  // Expose helpers/constants to the template.
  readonly TABS = TABS;
  readonly TONE = TONE;
  readonly STATUS = STATUS;
  readonly STAGES = STAGES;
  readonly CHAT_TEMPLATES = CHAT_TEMPLATES;
  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;
  readonly fmtLog = fmtLog;

  readonly selectedId = signal<string | null>(null);
  readonly tab = signal<string>('Pending');
  readonly compose = signal<Compose>({ mode: null, draft: '', link: '' });
  readonly chatDraft = signal('');
  readonly copied = signal(false);

  readonly scoped = computed(() => this.store.requests().filter(inScope));
  readonly filtered = computed(() => this.scoped().filter(TAB_FILTER[this.tab()]));
  readonly selected = computed(() => this.scoped().find((r) => r.id === this.selectedId()) || null);

  readonly stats = computed(() => [
    { label: 'Total requests', value: this.store.requests().length },
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
  }

  beginApprove(): void {
    const s = this.selected();
    if (!s) return;
    this.compose.set({ mode: 'approve', draft: approvalTemplate(s.municipality), link: makeLink(s.municipality) });
  }
  beginDecline(): void {
    const s = this.selected();
    if (!s) return;
    this.compose.set({ mode: 'decline', draft: declineTemplate(s.municipality), link: '' });
  }
  cancelCompose(): void {
    this.compose.set({ mode: null, draft: '', link: '' });
  }
  setDraft(value: string): void {
    this.compose.update((c) => ({ ...c, draft: value }));
  }

  confirmApprove(): void {
    const s = this.selected();
    const c = this.compose();
    if (!s || !c.draft.trim()) return;
    this.store.approve(s.id, c.draft, c.link, s.officialEmail);
    this.cancelCompose();
    this.setTab('Onboarding');
  }
  confirmDecline(): void {
    const s = this.selected();
    const c = this.compose();
    if (!s || !c.draft.trim()) return;
    this.store.decline(s.id, c.draft);
    this.cancelCompose();
    this.setTab('Declined');
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

  sendChat(r: RequestRecord): void {
    const draft = this.chatDraft();
    if (!draft.trim()) return;
    this.store.addMessage(r.id, draft.trim());
    this.chatDraft.set('');
  }
}
