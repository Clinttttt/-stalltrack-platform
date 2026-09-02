import { describe, expect, it } from 'vitest';
import { assessmentFields } from './console';
import { RequestRecord } from '../../core/demo';

/**
 * The operator's "Submitted assessment" list states what the record carries and nothing else.
 *
 * A row printed for a question nobody was asked reads as missing data or a broken screen, and the operator cannot tell the two
 * apart. Three of these fields are no longer asked at assessment, and one never was.
 */
function record(over: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: 'r1',
    municipality: 'Carmen',
    province: 'Surigao del Sur',
    facilitiesManaged: '',
    requestingOffice:
      'Municipality of Carmen, Province of Surigao del Sur, Caraga Region (Region XIII), Mindanao, Philippines',
    focalPerson: 'Juan D. Dela Cruz',
    position: 'Market Administrator',
    officialEmail: 'office@lgu.gov.ph',
    contactNumber: '09171234567',
    approxVendors: '',
    authorizationStatus: '',
    acknowledged: true,
    notes: '',
    submittedAt: '2026-09-02T00:00:00Z',
    status: 'Pending',
    stage: '',
    activated: false,
    decisionMessage: '',
    onboardingLink: '',
    log: [],
    ...over,
  } as RequestRecord;
}

const labels = (r: RequestRecord) => assessmentFields(r).map(([label]) => label);

describe('assessmentFields', () => {
  it('states the four things a focal person answers, and does not repeat the address', () => {
    // The municipality and its address are the heading above this list. Repeating either here, or printing a Province row the
    // address already contains, put one fact on the screen three times.
    expect(labels(record())).toEqual([
      'Focal person',
      'Position',
      'Official email',
      'Contact number',
      'Acknowledged',
    ]);
  });

  it('omits the questions the form stopped asking rather than printing them empty', () => {
    const rows = labels(record());

    expect(rows).not.toContain('Facilities managed');
    expect(rows).not.toContain('Authorization status');
    // Never asked by any form, so it was a guaranteed dash on every request ever recorded.
    expect(rows).not.toContain('Approx. vendors');
  });

  it('still shows what an older request carried', () => {
    // Requests recorded before those questions were dropped hold real answers, and the operator must see them.
    const rows = labels(
      record({
        facilitiesManaged: 'Public Market — daily stalls',
        authorizationStatus: 'In process',
        approxVendors: '40',
        notes: 'Ready by October.',
      }),
    );

    expect(rows).toContain('Facilities managed');
    expect(rows).toContain('Authorization status');
    expect(rows).toContain('Approx. vendors');
    expect(rows).toContain('Notes');
  });

  it('always states whether the LGU acknowledged, because "not confirmed" is the answer', () => {
    const rows = assessmentFields(record({ acknowledged: false }));

    expect(rows).toContainEqual(['Acknowledged', '']);
  });

  it('treats whitespace as unanswered', () => {
    // A field holding only spaces is not an answer, and printing its label would state that one was given.
    expect(labels(record({ notes: '   ', facilitiesManaged: ' ' }))).not.toContain('Notes');
    expect(labels(record({ notes: '   ', facilitiesManaged: ' ' }))).not.toContain('Facilities managed');
  });
});
