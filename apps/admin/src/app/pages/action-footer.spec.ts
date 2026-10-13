import { TestBed } from '@angular/core/testing';
import { ActivationApi } from '../core/activation.api';
import { AssessmentApi } from '../core/assessment.api';
import { RequestRecord, STATUS } from '../core/demo';
import { Activation } from './activation/activation';
import { Console } from './console/console';

/**
 * The primary action of every review panel is a fixed footer of that panel, not the last item of a long scrolling body. On a laptop
 * the body scrolls and the footer stays put; on a phone the footer is stuck to the bottom of the page. Either way the button the
 * reviewer came to press never leaves the screen.
 */
function request(id: string, municipality: string, status: RequestRecord['status'], stage: string, extra: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id, municipality, province: 'Surigao del Sur', requestingOffice: `Municipality of ${municipality}`, facilitiesManaged: '',
    focalPerson: 'Maria Concepcion Santos-Dela Cruz', position: 'Officer', officialEmail: 'office@example.test', contactNumber: '0917',
    approxVendors: '', authorizationStatus: '', acknowledged: true, notes: '', submittedAt: '2026-10-01T00:00:00Z',
    status, stage, activated: false, decisionMessage: '', onboardingLink: 'https://x.test/onboarding/abc', log: [], ...extra,
  };
}

function footerOf(root: HTMLElement) {
  const footer = root.querySelector('section footer') as HTMLElement | null;
  const body = root.querySelector('section .a-scroll') as HTMLElement | null;
  return { footer, body };
}

describe('Review panels keep their primary action in a fixed footer', () => {
  async function onboarding(r: RequestRecord) {
    TestBed.configureTestingModule({
      imports: [Console],
      providers: [{ provide: AssessmentApi, useValue: { list: vi.fn().mockResolvedValue({ ok: true, requests: [r] }), approve: vi.fn(), decline: vi.fn() } }],
    });
    const f = TestBed.createComponent(Console);
    await vi.waitFor(() => expect(f.componentInstance.loading()).toBe(false));
    f.componentInstance.select(r);
    f.detectChanges();
    return f;
  }

  it('Onboarding, pending: Approve and Decline are in the footer, not the scrolling body', async () => {
    const f = await onboarding(request('p1', 'Lanuza', STATUS.PENDING, 'Assessment'));
    const { footer, body } = footerOf(f.nativeElement);

    expect(footer?.className).toContain('sticky bottom-0');
    expect(footer?.textContent).toContain('Approve & issue link');
    expect(footer?.textContent).toContain('Decline');
    expect(body?.textContent).not.toContain('Approve & issue link');
  });

  it('Onboarding, composing: Send and Cancel move to the footer; the message stays in the body', async () => {
    const f = await onboarding(request('p1', 'Lanuza', STATUS.PENDING, 'Assessment'));
    f.componentInstance.beginApprove();
    f.detectChanges();
    const { footer, body } = footerOf(f.nativeElement);

    expect(footer?.textContent).toContain('Send approval');
    expect(footer?.textContent).toContain('Cancel');
    expect(body?.querySelector('textarea')).toBeTruthy();
    expect(body?.textContent).not.toContain('Send approval');
  });

  it('Onboarding room: Advance to Validation is in the footer, and says why it is unavailable', async () => {
    const f = await onboarding(request('o1', 'Carmen', STATUS.APPROVED, 'Onboarding'));
    const { footer } = footerOf(f.nativeElement);
    const advance = Array.from(footer!.querySelectorAll('button')).find((b) => b.textContent?.includes('Advance to Validation')) as HTMLButtonElement;

    expect(advance.disabled).toBe(true);
    expect(footer?.textContent).toContain('Available once the LGU submits.');
  });

  it('a request with nothing to decide (declined) has no footer at all', async () => {
    const f = await onboarding(request('d1', 'Madrid', STATUS.DECLINED, 'Assessment', { decisionMessage: 'No.' }));
    expect(footerOf(f.nativeElement).footer).toBeNull();
  });

  it('Activation: Activate, and Send and activate / Cancel, are in the footer', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Activation],
      providers: [
        {
          provide: AssessmentApi,
          useValue: {
            listMunicipalities: vi.fn().mockResolvedValue({ ok: true, municipalities: [] }),
            list: vi.fn().mockResolvedValue({ ok: true, requests: [request('a1', 'Carrascal', STATUS.APPROVED, 'Activation')] }),
            getDraftByRequest: vi.fn().mockResolvedValue({ ok: false, error: 'n/a' }),
          },
        },
        { provide: ActivationApi, useValue: { activate: vi.fn() } },
      ],
    });
    const f = TestBed.createComponent(Activation);
    await vi.waitFor(() => expect(f.componentInstance.loading()).toBe(false));
    f.componentInstance.select('a1');
    f.detectChanges();

    let { footer, body } = footerOf(f.nativeElement);
    expect(footer?.textContent).toContain('Activate Carrascal');
    expect(body?.textContent).not.toContain('Activate Carrascal');

    f.componentInstance.beginActivate();
    f.detectChanges();
    ({ footer, body } = footerOf(f.nativeElement));
    expect(footer?.textContent).toContain('Send and activate Carrascal');
    expect(footer?.textContent).toContain('Cancel');
    expect(body?.querySelector('textarea')).toBeTruthy();
  });
});
