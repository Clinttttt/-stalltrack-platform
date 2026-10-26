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
    expect(fixture.componentInstance.stats().find((s) => s.label === 'Active municipalities')?.value).toBe(2);
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

    expect(fixture.componentInstance.stats().find((s) => s.label === 'Active municipalities')?.value).toBe('—');
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

// ─────────────────────────────────────────────────────────────────────────────
// Activation history is municipality-oriented. Madrid appeared twice because the console marked EVERY request whose municipality name matched a live
// municipality as activated, and listed each. Every request keeps its own state in the request lists; the history says which municipalities are live.
// ─────────────────────────────────────────────────────────────────────────────

describe('Activation history is one row per municipality', () => {
  function dated(r: RequestRecord, province: string, submittedAt: string): RequestRecord {
    return { ...r, province, submittedAt };
  }

  async function open(
    live: Array<{ code: string; name: string; isActive: boolean }>,
    requests: RequestRecord[],
  ): Promise<Activation> {
    TestBed.configureTestingModule({
      imports: [Activation],
      providers: [
        {
          provide: AssessmentApi,
          useValue: {
            listMunicipalities: vi.fn().mockResolvedValue({ ok: true, municipalities: live }),
            list: vi.fn().mockResolvedValue({ ok: true, requests }),
            getDraftByRequest: vi.fn().mockResolvedValue({ ok: false, error: 'not needed' }),
          },
        },
        { provide: ActivationApi, useValue: { activate: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(Activation);
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const madrid = [{ code: 'MADRID', name: 'Madrid', isActive: true }];

  it('shows a municipality once when it raised two requests, and says it stands for both', async () => {
    const first = dated(request('madrid-1', 'Madrid', STATUS.COMPLETED, 'Completed'), 'Surigao del Sur', '2026-09-18T00:00:00Z');
    const again = dated(request('madrid-2', 'Madrid', STATUS.COMPLETED, 'Completed'), 'Surigao del Sur', '2026-10-02T00:00:00Z');
    const page = await open(madrid, [first, again]);

    expect(page.completedHistory().map((r) => r.id)).toEqual(['madrid-2']);          // the most recent completed request represents it
    expect(page.requestCountFor(page.completedHistory()[0])).toBe(2);
    expect(page.requests().map((r) => r.id)).toEqual(['madrid-1', 'madrid-2']);       // both requests are still on record
    expect(page.stats().find((s) => s.label === 'Active municipalities')?.value).toBe(1);
    expect(page.stats().find((s) => s.label === 'Total requests')?.value).toBe(2);
  });

  it('prefers the request that completed over a later one that only shares the live name', async () => {
    const done = dated(request('done', 'Madrid', STATUS.COMPLETED, 'Completed'), 'Surigao del Sur', '2026-09-18T00:00:00Z');
    const reRequest = dated(request('re-request', 'Madrid', STATUS.APPROVED, 'Validation'), 'Surigao del Sur', '2026-10-10T00:00:00Z');
    const page = await open(madrid, [done, reRequest]);

    expect(page.completedHistory().map((r) => r.id)).toEqual(['done']);
  });

  it('keeps the same name in another province as another municipality', async () => {
    const here = dated(request('here', 'Madrid', STATUS.COMPLETED, 'Completed'), 'Surigao del Sur', '2026-09-18T00:00:00Z');
    const there = dated(request('there', 'Madrid', STATUS.COMPLETED, 'Completed'), 'Marinduque', '2026-10-01T00:00:00Z');
    const page = await open(madrid, [here, there]);

    expect(page.completedHistory().map((r) => r.id).sort()).toEqual(['here', 'there']);
  });

  it('does not credit a shared name to either province when neither request completed', async () => {
    // The live registry carries no province, so "Madrid is live" cannot say WHICH Madrid. Nothing is claimed for either.
    const a = dated(request('a', 'Madrid', STATUS.APPROVED, 'Validation'), 'Surigao del Sur', '2026-09-18T00:00:00Z');
    const b = dated(request('b', 'Madrid', STATUS.APPROVED, 'Validation'), 'Marinduque', '2026-10-01T00:00:00Z');
    const page = await open(madrid, [a, b]);

    expect(page.completedHistory()).toEqual([]);
  });

  it('still lists a municipality that went live before the request flow, once, when only its name matches', async () => {
    const legacy = request('legacy', 'Cantilan', STATUS.APPROVED, 'Validation');
    const page = await open([{ code: 'CANTILAN', name: 'Cantilan', isActive: true }], [legacy]);

    expect(page.completedHistory().map((r) => r.id)).toEqual(['legacy']);
  });

  it('does not list a municipality that is not live', async () => {
    const waiting = request('waiting', 'Lanuza', STATUS.APPROVED, 'Activation');
    const page = await open([{ code: 'LANUZA', name: 'Lanuza', isActive: false }], [waiting]);

    expect(page.completedHistory()).toEqual([]);
  });
});
