import { TestBed } from '@angular/core/testing';
import { ActivationApi } from '../../core/activation.api';
import { AssessmentApi } from '../../core/assessment.api';
import { STATUS } from '../../core/demo';
import type { RequestRecord } from '../../core/demo';
import { Activation } from './activation';

function request(
  id: string,
  municipality: string,
  status: RequestRecord['status'],
  stage: string,
): RequestRecord {
  return {
    id,
    municipality,
    province: 'Surigao del Sur',
    facilitiesManaged: 'Public Market',
    requestingOffice: 'Municipal Hall',
    focalPerson: 'Focal Person',
    position: 'Officer',
    officialEmail: `${municipality.toLowerCase()}@example.test`,
    contactNumber: '09123456789',
    approxVendors: '',
    authorizationStatus: '',
    acknowledged: true,
    notes: '',
    submittedAt: '2026-09-18T00:00:00Z',
    status,
    stage,
    activated: false,
    decisionMessage: '',
    onboardingLink: '',
    log: [],
  };
}

describe('Activation page rollout state', () => {
  it('keeps completed pipelines in history and counts live municipalities from the registry', async () => {
    const assessmentApi = {
      listMunicipalities: vi.fn().mockResolvedValue({
        ok: true,
        municipalities: [
          { code: 'CARMEN', name: 'Carmen', isActive: true },
          { code: 'CANTILAN', name: 'Cantilan', isActive: true },
          { code: 'LANUZA', name: 'Lanuza', isActive: false },
        ],
      }),
      list: vi.fn().mockResolvedValue({
        ok: true,
        requests: [
          request('completed', 'Carmen', STATUS.COMPLETED, 'Completed'),
          request('ready', 'Lanuza', STATUS.APPROVED, 'Activation'),
        ],
      }),
      getDraftByRequest: vi.fn().mockResolvedValue({ ok: false, error: 'not needed' }),
    };

    TestBed.configureTestingModule({
      imports: [Activation],
      providers: [
        { provide: AssessmentApi, useValue: assessmentApi },
        { provide: ActivationApi, useValue: { activate: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(Activation);
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
    fixture.detectChanges();

    expect(fixture.componentInstance.scoped().map((r) => r.id)).toEqual(['ready']);
    expect(fixture.componentInstance.completedHistory().map((r) => r.id)).toEqual(['completed']);
    expect(fixture.componentInstance.stats().find((s) => s.label === 'Activated')?.value).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Activation history');
    expect(fixture.nativeElement.textContent).toContain('Carmen');
    expect(fixture.nativeElement.textContent).toContain('Lanuza');

    fixture.destroy();
  });

  it('does not fabricate an activated count when the live registry is unavailable', async () => {
    TestBed.configureTestingModule({
      imports: [Activation],
      providers: [
        {
          provide: AssessmentApi,
          useValue: {
            listMunicipalities: vi.fn().mockResolvedValue({ ok: false, error: 'Unavailable' }),
            list: vi.fn().mockResolvedValue({ ok: true, requests: [] }),
            getDraftByRequest: vi.fn(),
          },
        },
        { provide: ActivationApi, useValue: { activate: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(Activation);
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));

    expect(fixture.componentInstance.stats().find((s) => s.label === 'Activated')?.value).toBe('—');
    fixture.destroy();
  });
});
