import { TestBed } from '@angular/core/testing';
import { ActivationApi } from '../../core/activation.api';
import { AssessmentApi } from '../../core/assessment.api';
import { RequestRecord, STATUS } from '../../core/demo';
import { PrivacyService } from '../../shared/privacy/privacy.service';
import { Activation } from './activation';

// A made-up one-time credential, long and distinctive so any leak is a plain substring match.
const TOKEN = 'tkn_Zq81-ExampleOneTimeCredential_7f3a9c0d';
const LINK = `https://console.example.test/activate/${TOKEN}`;

function live(): RequestRecord {
  return {
    id: 'r1', municipality: 'Madrid', province: 'Surigao del Sur', requestingOffice: 'Municipality of Madrid',
    facilitiesManaged: '', focalPerson: 'Focal', position: 'Officer', officialEmail: 'office@example.test', contactNumber: '0917',
    approxVendors: '', authorizationStatus: '', acknowledged: true, notes: '', submittedAt: '2026-10-01T00:00:00Z',
    status: STATUS.APPROVED, stage: 'Activation', activated: true, decisionMessage: '', onboardingLink: '', log: [],
    headActivationLink: LINK, headActivationMessage: 'Welcome.',
  };
}

describe('Activation: the Head activation link is a live credential', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [Activation],
      providers: [
        {
          provide: AssessmentApi,
          useValue: {
            listMunicipalities: vi.fn().mockResolvedValue({ ok: true, municipalities: [{ code: 'MADRID', name: 'Madrid', isActive: true }] }),
            list: vi.fn().mockResolvedValue({ ok: true, requests: [live()] }),
            getDraftByRequest: vi.fn().mockResolvedValue({ ok: false, error: 'not needed' }),
          },
        },
        { provide: ActivationApi, useValue: { activate: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(Activation);
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
    fixture.componentInstance.select('r1');
    fixture.detectChanges();
    return fixture;
  }

  it('is not on the page until it is asked for, and the page still says there is a link', async () => {
    const fixture = await setup();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;

    expect(html).not.toContain(TOKEN);
    expect(html).toContain('https://console.example.test/activate/••••••••');
    expect(fixture.componentInstance.linkRevealed()).toBe(false);
  });

  it('shows the whole link on request, for that municipality only, and hides it again on request', async () => {
    const fixture = await setup();
    const privacy = TestBed.inject(PrivacyService);

    fixture.componentInstance.toggleLink();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(TOKEN);
    expect(privacy.isRevealed('link:r1')).toBe(true);

    fixture.componentInstance.toggleLink();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).innerHTML).not.toContain(TOKEN);
  });

  it('cannot be shown while Privacy mode is on', async () => {
    const fixture = await setup();
    const privacy = TestBed.inject(PrivacyService);
    privacy.setPrivacyMode(true);

    fixture.componentInstance.toggleLink();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).innerHTML).not.toContain(TOKEN);
    const show = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Show') as HTMLButtonElement;
    expect(show.disabled).toBe(true);
  });

  it('leaving the page hides it again', async () => {
    const fixture = await setup();
    const privacy = TestBed.inject(PrivacyService);
    fixture.componentInstance.toggleLink();
    expect(privacy.isRevealed('link:r1')).toBe(true);

    fixture.destroy();

    expect(privacy.revealedId()).toBeNull();
  });

  it('masks only the credential segment of the link', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance.maskedLink(LINK)).toBe('https://console.example.test/activate/••••••••');
    expect(fixture.componentInstance.maskedLink('https://x.test/a/b')).toBe('https://x.test/a/••••••••');
  });
});
