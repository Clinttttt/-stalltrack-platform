// ─────────────────────────────────────────────────────────────────────────────
// DEMO data for the admin console. Illustrative only — nothing here is persisted or
// connected to the live system. When the API is wired, replace `seedRequests()` with
// a fetch to the StallTrack platform endpoints (assessment requests + onboarding).
//
// Faithful Angular/TypeScript port of the React apps/admin/src/data/demo.js.
// ─────────────────────────────────────────────────────────────────────────────

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

let _id = 0;
const nid = () => `req-${++_id}`;

// Fresh copy each call so component state owns a mutable working set.
export function seedRequests(): RequestRecord[] {
  _id = 0;
  return [
    {
      id: nid(),
      municipality: 'Madrid',
      province: 'Surigao del Sur',
      facilitiesManaged: 'Barbecue / food stalls, Public Market — daily stalls',
      requestingOffice: 'Local Economic Enterprise Office (LEEO)',
      focalPerson: 'Clint Villanueva',
      position: 'LEEO Officer',
      officialEmail: 'clintvillanueva82@gmail.com',
      contactNumber: '0912 345 6789',
      approxVendors: '~180',
      authorizationStatus: 'In process',
      acknowledged: true,
      notes: '',
      submittedAt: '2026-07-02T13:31:00',
      status: STATUS.PENDING,
      stage: 'Assessment',
      activated: false,
      decisionMessage: '',
      onboardingLink: '',
      log: [],
    },
    {
      id: nid(),
      municipality: 'Carmen',
      province: 'Surigao del Sur',
      facilitiesManaged: 'Public Market, Commercial Center, Slaughterhouse, Transport Terminal, Weekly market',
      requestingOffice: 'Office of the Municipal Treasurer',
      focalPerson: 'Maria Santos',
      position: 'Municipal Treasurer',
      officialEmail: 'treasury.carmen@example.gov.ph',
      contactNumber: '0917 222 3344',
      approxVendors: '~95',
      authorizationStatus: "Endorsed by Mayor's Office",
      acknowledged: true,
      notes: '',
      submittedAt: '2026-07-01T09:10:00',
      status: STATUS.APPROVED,
      stage: 'Validation',
      activated: false,
      decisionMessage: '',
      onboardingLink: 'https://stalltrack.site/onboarding/carmen-4b8e1a90',
      lguAcknowledgedAt: '2026-07-02T08:40:00',
      lguSubmittedForValidation: '2026-07-02T16:05:00',
      checklist: ONBOARDING_CHECKLIST.map((label) => ({ label, done: true })),
      config: {
        facilities: [
          {
            name: 'Public Market', type: 'Daily stall', rateAmount: '25', rateUnit: 'per day', unitLabel: 'stalls', units: '',
            sections: [
              { name: 'Fish', units: '40', fees: [{ label: 'Fish (per kilo)', amount: '1', unit: 'per kilo' }] },
              { name: 'Meat', units: '30', fees: [] },
              { name: 'Vegetables', units: '50', fees: [] },
            ],
            addOns: [
              { label: 'Electricity', basis: 'Per consumption', amount: '', unit: 'per month', mode: 'Optional (per stall)' },
              { label: 'Water', basis: 'Per consumption', amount: '', unit: 'per month', mode: 'Optional (per stall)' },
            ],
            rateItems: [],
          },
          {
            name: 'Commercial Center', type: 'Monthly rental', rateAmount: '2400', rateUnit: 'per month', unitLabel: 'spaces', units: '24',
            sections: [], addOns: [], rateItems: [],
          },
          {
            name: 'Slaughterhouse', type: 'Per head', rateAmount: '', rateUnit: 'per head', unitLabel: 'heads', units: '',
            sections: [], addOns: [],
            rateItems: [{ label: 'Hog', amount: '250' }, { label: 'Cattle / Carabao', amount: '365' }],
          },
          {
            name: 'Transport Terminal', type: 'Per trip', rateAmount: '10', rateUnit: 'per trip', unitLabel: 'trips', units: '',
            sections: [], addOns: [], rateItems: [],
          },
          {
            name: 'Weekly / Tabo Market', type: 'Weekly market', rateAmount: '100', rateUnit: 'per vendor', unitLabel: 'vendors', units: '',
            sections: [], addOns: [], rateItems: [],
          },
        ],
        orSeries: 'CAR-2026-000001',
        users: [
          { name: 'Maria Santos', role: 'Administrator (Super Admin)', email: 'treasury.carmen@example.gov.ph' },
        ],
      },
      log: [
        { at: '2026-07-01T10:00:00', text: 'Assessment approved. Onboarding link issued to the LGU focal person.' },
        { at: '2026-07-02T16:05:00', text: 'LGU submitted their onboarding checklist for validation.' },
        { at: '2026-07-02T16:30:00', text: 'Onboarding accepted — advanced to the Validation stage.' },
      ],
    },
    {
      id: nid(),
      municipality: 'Carrascal',
      province: 'Surigao del Sur',
      facilitiesManaged: 'Public Market — daily stalls, Slaughterhouse, Weekly market',
      requestingOffice: 'Local Economic Enterprise Office (LEEO)',
      focalPerson: 'Jose Reyes',
      position: 'LEEO Head',
      officialEmail: 'leeo.carrascal@example.gov.ph',
      contactNumber: '0918 555 1212',
      approxVendors: '~140',
      authorizationStatus: 'Approved by Sangguniang Bayan',
      acknowledged: true,
      notes: '',
      submittedAt: '2026-06-28T14:05:00',
      status: STATUS.APPROVED,
      stage: 'Onboarding',
      activated: false,
      decisionMessage: '',
      onboardingLink: 'https://stalltrack.site/onboarding/carrascal-7f3a9c2e',
      lguAcknowledgedAt: '2026-06-29T09:15:00',
      lguSubmittedForValidation: '2026-06-30T14:20:00',
      checklist: ONBOARDING_CHECKLIST.map((label) => ({ label, done: true })),
      config: {
        facilities: [
          {
            name: 'Public Market', type: 'Daily stall', rateAmount: '30', rateUnit: 'per day', unitLabel: 'stalls', units: '',
            sections: [
              { name: 'Fish', units: '50', fees: [{ label: 'Fish (per kilo)', amount: '1', unit: 'per kilo' }] },
              { name: 'Meat', units: '40', fees: [] },
              { name: 'Vegetables', units: '50', fees: [] },
            ],
            addOns: [
              { label: 'Electricity', basis: 'Per consumption', amount: '', unit: 'per month', mode: 'Optional (per stall)' },
              { label: 'Water', basis: 'Per consumption', amount: '', unit: 'per month', mode: 'Optional (per stall)' },
            ],
            rateItems: [],
          },
          {
            name: 'Slaughterhouse', type: 'Per head', rateAmount: '', rateUnit: 'per head', unitLabel: 'heads', units: '',
            sections: [], addOns: [],
            rateItems: [
              { label: 'Hog', amount: '250' },
              { label: 'Cattle / Carabao', amount: '365' },
            ],
          },
          {
            name: 'Weekly Market', type: 'Weekly market', rateAmount: '100', rateUnit: 'per vendor', unitLabel: 'vendors', units: '60',
            sections: [], addOns: [], rateItems: [],
          },
        ],
        orSeries: 'CARR-2026-000001',
        users: [
          { name: 'Jose Reyes', role: 'Administrator (Super Admin)', email: 'leeo.carrascal@example.gov.ph' },
        ],
      },
      log: [
        { at: '2026-06-28T15:00:00', text: 'Assessment approved. Onboarding link issued to the LGU focal person.' },
        { at: '2026-06-29T10:30:00', text: 'Facility inventory and rate schedule received; preparing the onboarding workspace.' },
      ],
    },
    {
      id: nid(),
      municipality: 'Lanuza',
      province: 'Surigao del Sur',
      facilitiesManaged: 'Public Market — daily stalls',
      requestingOffice: 'Office of the Mayor',
      focalPerson: 'Ana Cruz',
      position: 'Administrative Officer',
      officialEmail: 'mayor.lanuza@example.gov.ph',
      contactNumber: '0920 111 8899',
      approxVendors: '~40',
      authorizationStatus: 'Preliminary inquiry',
      acknowledged: false,
      notes: '',
      submittedAt: '2026-06-25T11:00:00',
      status: STATUS.DECLINED,
      stage: 'Assessment',
      activated: false,
      decisionMessage:
        'Thank you for your interest in StallTrack. We are unable to proceed with Lanuza at this time because the request has not yet been formally authorized by the LGU. You are welcome to re-submit once an official endorsement from the Mayor\u2019s Office or Sangguniang Bayan is in place.',
      onboardingLink: '',
      log: [],
    },
  ];
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

export function makeLink(m: string): string {
  const token = Math.random().toString(16).slice(2, 10);
  return `https://stalltrack.site/onboarding/${m.toLowerCase()}-${token}`;
}
