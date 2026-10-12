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

describe("Activation page: the Head link comes from the API", () => {
  const workspace = {
    facilities: [{ id: "f", catalogKey: "public_market", name: "Pamilihan", type: "Daily stall", rateAmount: "", rateUnit: "per day", unitLabel: "stalls", units: "", sections: [{ name: "Gulayan", kind: "VegetableArea", units: "5", rate: "30", fees: [] }], addOns: [] }],
    administrator: { name: "Ana Cruz", email: "ana@lgu.test" },
    branding: { officeName: "Lanuza Enterprise Office (LEO)" },
    operations: { version: 1, items: [{ operationCode: "MARKET_FEES", selected: true }] },
  };

  async function activate(result: unknown) {
    const activateSpy = vi.fn().mockResolvedValue(result);
    TestBed.configureTestingModule({
      imports: [Activation],
      providers: [
        {
          provide: AssessmentApi,
          useValue: {
            listMunicipalities: vi.fn().mockResolvedValue({ ok: true, municipalities: [] }),
            list: vi.fn().mockResolvedValue({ ok: true, requests: [request("ready", "Lanuza", STATUS.APPROVED, "Activation")] }),
            getDraftByRequest: vi.fn().mockResolvedValue({ ok: true, draft: { configJson: JSON.stringify(workspace) } }),
          },
        },
        { provide: ActivationApi, useValue: { activate: activateSpy } },
      ],
    });
    const fixture = TestBed.createComponent(Activation);
    const c = fixture.componentInstance;
    await vi.waitFor(() => expect(c.loading()).toBe(false));
    c.select("ready");
    await vi.waitFor(() => expect(c.selected()?.config).toBeTruthy());
    c.beginActivate();
    await c.confirmActivate();
    return { c, activateSpy, fixture };
  }

  it("uses the activation URL the API returned and never builds a production host from the token", async () => {
    const local = "https://localhost:7167/activate/SECRET-LOCAL-TOKEN";
    const { c, activateSpy, fixture } = await activate({ ok: true, result: { activationToken: "SECRET-LOCAL-TOKEN", activationUrl: local } });

    expect(c.link()).toBe(local);
    expect(c.selected()?.headActivationLink).toBe(local);
    expect(c.link()).not.toContain("stalltrack.site");
    // The command carried the declared operations as configuration.
    expect(activateSpy.mock.calls[0][0].operationDeclarations).toEqual([{ operationCode: "MARKET_FEES", selected: true }]);
    fixture.destroy();
  });

  it("does not invent a link when the API returns none, and says so", async () => {
    const { c, fixture } = await activate({ ok: true, result: { activationToken: "TOKEN-ONLY" } });

    expect(c.link()).toBe("");
    expect(c.activateError()).toMatch(/did not return the Head.s activation link/);
    expect(JSON.stringify(c.selected())).not.toContain("console.stalltrack.site");
    fixture.destroy();
  });

  it("counts a municipality activated in this session as completed history straight away", async () => {
    const { c, fixture } = await activate({ ok: true, result: { activationToken: "T", activationUrl: "https://x.test/activate/T" } });
    expect(c.completedHistory().map((r) => r.municipality)).toContain("Lanuza");
    fixture.destroy();
  });
});
