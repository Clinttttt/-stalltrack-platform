import { TestBed } from '@angular/core/testing';
import { ActivationApi } from '../../core/activation.api';
import { AssessmentApi } from '../../core/assessment.api';
import { RequestRecord, STATUS } from '../../core/demo';
import { PrivacyService } from '../../shared/privacy/privacy.service';
import { Validation } from './validation';

const CONFIG = JSON.stringify({
  branding: { officeName: 'Madrid Economic Enterprise Office' },
  administrator: { name: 'Ana Cruz', email: 'head.private@madrid.example.test' },
  facilities: [
    {
      id: 'f1', catalogKey: 'weekly', archetype: 'Weekly', name: 'Weekly Market', type: 'Weekly market',
      rateAmount: '4321', rateUnit: 'per day', unitLabel: 'stalls', units: '12', monthlyRent: '', monthBasis: '', ordinance: '',
      notes: '', marketDay: 'Sunday', sections: [], addOns: [],
    },
  ],
  weighing: { version: 1, fishEnabled: true, fishRate: '2.50', meatEnabled: false, meatRate: '' },
  operations: { version: 1, items: [
    { operationCode: 'FISH_MEAT_VENDOR_FEE', selected: true, localDisplayName: 'Fish & Meat Vendors' },
    { operationCode: 'ECF', selected: true },
    { operationCode: 'KANMANGGAY_SPACE_RENTAL', selected: true, localDisplayName: 'Plaza Space Rental' },
    { operationCode: 'TRANSPORTATION', selected: true },
  ] },
});

function inValidation(id: string, municipality: string): RequestRecord {
  return {
    id, municipality, province: 'Surigao del Sur', requestingOffice: `Municipality of ${municipality}`,
    facilitiesManaged: '', focalPerson: 'Focal', position: 'Officer', officialEmail: 'office@example.test', contactNumber: '0917',
    approxVendors: '', authorizationStatus: '', acknowledged: true, notes: '', submittedAt: '2026-10-01T00:00:00Z',
    status: STATUS.APPROVED, stage: 'Validation', activated: false, decisionMessage: '', onboardingLink: '', log: [],
    lguSubmittedForValidation: '2026-10-02T00:00:00Z',
  };
}

describe('Validation: sensitive submitted details are held back until a reviewer asks', () => {
  const approveValidation = vi.fn();
  const preflight = vi.fn();

  async function setup(requests: RequestRecord[] = [inValidation('r1', 'Madrid'), inValidation('r2', 'Carmen')]) {
    approveValidation.mockReset().mockResolvedValue({ ok: true, request: { ...requests[0], stage: 'Activation' } });
    preflight.mockReset().mockResolvedValue({ ok: true });
    TestBed.configureTestingModule({
      imports: [Validation],
      providers: [
        {
          provide: AssessmentApi,
          useValue: { list: vi.fn().mockResolvedValue({ ok: true, requests }), getDraftByRequest: vi.fn().mockResolvedValue({ ok: true, draft: { configJson: CONFIG } }), approveValidation, returnToOnboarding: vi.fn() },
        },
        { provide: ActivationApi, useValue: { preflight } },
      ],
    });
    const fixture = TestBed.createComponent(Validation);
    await vi.waitFor(() => expect(fixture.componentInstance.selected()?.config).toBeTruthy());
    fixture.detectChanges();
    const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
    const click = (label: string) => {
      const el = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button, label')).find((x) =>
        x.textContent?.trim().includes(label),
      ) as HTMLElement | undefined;
      expect(el, `control "${label}"`).toBeTruthy();
      el!.click();
      fixture.detectChanges();
    };
    return { fixture, text, click, privacy: TestBed.inject(PrivacyService) };
  }

  it('hides rates and addresses by default, but never the operation names or the configuration itself', async () => {
    const { text } = await setup();
    expect(text()).not.toContain('4321');
    expect(text()).not.toContain('₱2.50');
    expect(text()).toContain('Fish weighing');
    expect(text()).toContain('Enabled · Rate hidden');
    expect(text()).not.toContain('head.private@madrid.example.test');
    expect(text()).toContain('Weekly Market');
    expect(text()).toContain('Fish / Meat Vendor Fee');
    expect(text()).toContain('Plaza Space Rental');
    expect(text()).toContain('Rates, fees and e-mail addresses are hidden');
  });

  it('groups declared operations by income-statement group with one note, not one per row', async () => {
    const { text } = await setup();
    for (const g of ['Market collections', 'Utilities', 'Spaces & rentals', 'Other enterprise operations']) expect(text()).toContain(g);
    expect(text().match(/setup after activation/gi)).toBeNull();
    expect(text()).toContain('does not activate it');
  });

  it('Reveal details shows them, for that municipality only', async () => {
    const { text, click, privacy, fixture } = await setup();
    click('Reveal details');
    expect(text()).toContain('4321');
    expect(text()).toContain('₱2.50');
    expect(text()).toContain('head.private@madrid.example.test');
    expect(privacy.isRevealed('r1')).toBe(true);
    expect(privacy.isRevealed('r2')).toBe(false);

    // Switching to the other request hides again.
    fixture.componentInstance.select('r2');
    fixture.detectChanges();
    expect(text()).not.toContain('4321');
    expect(privacy.revealedId()).toBeNull();
  });

  it('Privacy mode hides what is showing and removes the Reveal control', async () => {
    const { text, click, fixture } = await setup();
    click('Reveal details');
    expect(text()).toContain('4321');
    fixture.componentInstance.togglePrivacyMode();
    fixture.detectChanges();
    expect(text()).not.toContain('4321');
    expect(text()).toContain('Privacy mode is on');
    expect(text()).not.toContain('Reveal details');
  });

  it('asks once before approving with amounts still hidden, then approves on confirmation', async () => {
    const { click, text } = await setup();
    click('Approve and send to Activation');
    expect(text()).toContain('Rates and fees are still hidden');
    expect(approveValidation).not.toHaveBeenCalled();

    click('Approve anyway');
    await vi.waitFor(() => expect(approveValidation).toHaveBeenCalledWith('r1'));
  });

  it('approves without the question once the details have been revealed', async () => {
    const { click, text } = await setup();
    click('Reveal details');
    click('Approve and send to Activation');
    expect(text()).not.toContain('still hidden');
    await vi.waitFor(() => expect(approveValidation).toHaveBeenCalledWith('r1'));
  });

  it('keeps the decision in a fixed footer of the panel, outside the scrolling body, so it never leaves the screen', async () => {
    const { fixture } = await setup();
    const root = fixture.nativeElement as HTMLElement;
    const footer = root.querySelector('section footer') as HTMLElement;
    const body = root.querySelector('section .a-scroll') as HTMLElement;

    expect(footer).toBeTruthy();
    expect(footer.className).toContain('shrink-0');
    expect(footer.className).toContain('sticky bottom-0'); // pinned to the page bottom on phones
    expect(footer.className).toContain('lg:static'); // a fixed row of the panel on desktop
    expect(footer.textContent).toContain('Approve and send to Activation');
    expect(footer.textContent).toContain('Return to onboarding');
    expect(body.contains(footer)).toBe(false);
    expect(body.textContent).not.toContain('Approve and send to Activation');
    expect(body.className).toContain('lg:overflow-y-auto'); // the scroll happens in the intended panel
  });

  it('hides everything again when the reviewer leaves the page', async () => {
    const { click, privacy, fixture } = await setup();
    click('Reveal details');
    expect(privacy.isRevealed('r1')).toBe(true);
    fixture.destroy();
    expect(privacy.revealedId()).toBeNull();
  });

  it('does not hide a validation error or the reason approval is blocked', async () => {
    const { click, text } = await setup();
    preflight.mockResolvedValue({ ok: false, error: 'Preflight refused: the rate for the Weekly Market is missing.' });
    click('Reveal details');
    click('Approve and send to Activation');
    await vi.waitFor(() => expect(text()).toContain('Preflight refused'));
  });
});
