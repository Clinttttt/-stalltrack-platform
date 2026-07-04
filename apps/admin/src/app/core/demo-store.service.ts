import { Injectable, signal } from '@angular/core';
import { RequestRecord, STATUS, seedRequests } from './demo';

// ─────────────────────────────────────────────────────────────────────────────
// Shared in-memory store for the admin demo. Holds the single working set of LGU
// requests and the pipeline actions, so Onboarding → Validation → Activation pages
// all read/mutate the same data (an LGU advanced on one page appears on the next).
//
// DEMO ONLY: nothing is persisted. In production these actions become API calls.
//
// Faithful Angular port of the React apps/admin/src/store/DemoStore.jsx. Provided at
// the AdminLayout component level so the three console pages share one working set
// (mirrors the React provider wrapping the routed <Outlet />).
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DemoStore {
  readonly requests = signal<RequestRecord[]>(seedRequests());

  private patch(id: string, changes: Partial<RequestRecord>): void {
    this.requests.update((rs) => rs.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  }

  private addLog(id: string, text: string): void {
    this.requests.update((rs) =>
      rs.map((r) => (r.id === id ? { ...r, log: [...r.log, { at: new Date().toISOString(), text }] } : r)),
    );
  }

  // ── Assessment ──
  approve(id: string, message: string, link: string, email: string): void {
    this.patch(id, { status: STATUS.APPROVED, stage: 'Onboarding', onboardingLink: link, decisionMessage: message });
    this.addLog(id, `Assessment approved. Onboarding link issued to ${email}.`);
  }
  decline(id: string, message: string): void {
    this.patch(id, { status: STATUS.DECLINED, decisionMessage: message });
    this.addLog(id, 'Assessment declined; notice sent to the LGU focal person.');
  }
  reopen(id: string): void {
    this.patch(id, { status: STATUS.PENDING, stage: 'Assessment', decisionMessage: '' });
    this.addLog(id, 'Request reopened for review.');
  }

  // ── Onboarding → Validation ──
  sendToValidation(id: string): void {
    this.patch(id, { stage: 'Validation' });
    this.addLog(id, 'Onboarding accepted — advanced to the Validation stage.');
  }
  returnToOnboarding(id: string, note?: string): void {
    this.patch(id, { stage: 'Onboarding' });
    this.addLog(id, note ? `Returned to Onboarding: ${note}` : 'Returned to Onboarding for corrections.');
  }

  // ── Validation → Activation ──
  approveValidation(id: string): void {
    this.patch(id, { stage: 'Activation', validated: true });
    this.addLog(id, 'Validation dry-run approved — queued for activation.');
  }

  // ── Activation ──
  activate(id: string, headLink: string, message: string): void {
    this.patch(id, { activated: true, stage: 'Activation', headActivationLink: headLink, headActivationMessage: message });
    this.addLog(id, 'Portal activated. Head account-activation link issued.');
  }

  // ── Messaging ──
  addMessage(id: string, text: string): void {
    this.addLog(id, text);
  }
}
