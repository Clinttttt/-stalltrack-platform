// ─────────────────────────────────────────────────────────────────────────────
// The admin console's shared shapes: the pipeline stages, the request record every page reads, the status
// helpers, and the decision-message templates.
//
// This file WAS demo data, and its header still said so long after that stopped being true. All three console
// pages now read the live platform endpoints - Console and Validation through AssessmentApi, Activation through
// ActivationApi as well - and only these types and constants remained in use.
//
// The seeded records went with the header (2026-08-17). They described assessment requests and onboarding links
// for named municipalities, complete with plausible focal persons, e-mail addresses and dated log entries, for
// LGUs that have never applied - AssessmentRequests is an empty table. Nothing rendered them: the DemoStore that
// held them was still provided by the layout but injected by no page. They were dead weight that read as real,
// which is worse than dead weight, and they invited exactly the wrong conclusion when this console was audited.
//
// So: no fabricated municipalities here. If sample data is ever wanted again, it belongs behind something that
// says on screen that it is sample data.
// ─────────────────────────────────────────────────────────────────────────────

import { SectionKind } from './market-sections';

export const STAGES = ['Assessment', 'Onboarding', 'Validation', 'Activation'] as const;

// The onboarding checklist an LGU works through on their onboarding page.
export const ONBOARDING_CHECKLIST = [
  'Confirm facilities & scope',
  'Rates & ordinance references',
  'Authorized users',
  'Branding, seal & OR series',
  'Validation dry-run',
];

export const STATUS = {
  PENDING: 'PendingReview',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
} as const;

export type RequestStatus = (typeof STATUS)[keyof typeof STATUS];

export interface Fee {
  label: string;
  amount: string;
  unit: string;
}

export interface Section {
  name: string;
  /**
   * Which collection area of the daily sheet this section is, as declared by the LGU during onboarding, or
   * 'CustomArea' where the LGU declared an area of its own. Absent on drafts saved before the question was asked; the
   * platform never infers it from `name`.
   */
  kind?: SectionKind;
  units: string;
  rate?: string;
  fees: Fee[];
}

export interface AddOn {
  label: string;
  basis: string;
  amount: string;
  unit: string;
  mode: string;
}

export interface RateItem {
  label: string;
  amount: string;
}

export interface Facility {
  name: string;
  type: string;
  rateAmount: string;
  /** A daily-stall market only: the monthly rent a space is let for, when the ordinance states one. */
  monthlyRent?: string;
  /**
   * A daily-stall market only: how the office measures what a MONTH owes.
   *
   * `RentGoal` — the month is let for a rent and collected in daily installments, so February owes the same as August.
   * `PureDays` — the month owes the days it has, so a 31-day month owes thirty-one fees and February twenty-eight.
   *
   * Absent means the rent goal, which is what every office onboarded before this existed is on. An office on `PureDays` has
   * no monthly rent to state, and `monthlyRent` is ignored for it.
   */
  monthBasis?: 'RentGoal' | 'PureDays';
  rateUnit: string;
  unitLabel: string;
  units: string;
  marketDay?: string;
  sections: Section[];
  addOns: AddOn[];
  rateItems: RateItem[];
}

export interface ConfigUser {
  name: string;
  role: string;
  email: string;
}

export interface Config {
  facilities: Facility[];
  orSeries: string;
  users: ConfigUser[];
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface LogEntry {
  at: string;
  text: string;
}

export interface RequestRecord {
  id: string;
  municipality: string;
  province: string;
  facilitiesManaged: string;
  requestingOffice: string;
  focalPerson: string;
  position: string;
  officialEmail: string;
  contactNumber: string;
  approxVendors: string;
  authorizationStatus: string;
  acknowledged: boolean;
  notes: string;
  submittedAt: string;
  status: RequestStatus;
  stage: string;
  activated: boolean;
  decisionMessage: string;
  onboardingLink: string;
  log: LogEntry[];
  lguAcknowledgedAt?: string;
  lguSubmittedForValidation?: string;
  checklist?: ChecklistItem[];
  config?: Config;
  validated?: boolean;
  headActivationLink?: string;
  headActivationMessage?: string;
}

export function statusLabel(s: RequestStatus): string {
  if (s === STATUS.PENDING) return 'Pending review';
  if (s === STATUS.APPROVED) return 'Onboarding';
  return 'Declined';
}

export function statusTone(s: RequestStatus): 'amber' | 'green' | 'red' {
  if (s === STATUS.PENDING) return 'amber';
  if (s === STATUS.APPROVED) return 'green';
  return 'red';
}

export function approvalTemplate(m: string): string {
  return (
    `Congratulations! Your StallTrack assessment for ${m} has been reviewed and approved.\n\n` +
    'You may now proceed to the Onboarding stage. A secure onboarding link has been sent to this ' +
    'email address — please open it to continue with facility, rate, and user preparation.\n\n' +
    '— StallTrack Platform Team'
  );
}

export function declineTemplate(m: string): string {
  return (
    `Thank you for your interest in StallTrack. After reviewing your assessment for ${m}, we are ` +
    'unable to proceed at this time.\n\nPlease address the noted requirements and you are welcome to ' +
    're-submit. Our team is happy to assist with any questions.\n\n— StallTrack Platform Team'
  );
}

export const CHAT_TEMPLATES: ReadonlyArray<{ label: string; text: (m: string) => string }> = [
  { label: 'Congratulations', text: (m) => `Congratulations! ${m}'s assessment has been approved. You may now proceed to the next step of onboarding using the secure link we provided.` },
  { label: 'Request documents', text: (m) => `To continue ${m}'s onboarding, kindly prepare the facility inventory, rate/ordinance references, and the list of authorized users. Reply here once ready.` },
  { label: 'Reminder', text: (m) => `Friendly reminder regarding ${m}'s onboarding — please complete the pending items so we can proceed to validation.` },
  { label: 'Sorry / issue', text: (m) => `We're sorry — we found an issue that needs to be resolved before ${m} can proceed. Our team will coordinate with your office on the details.` },
];
