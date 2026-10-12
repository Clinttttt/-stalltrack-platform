import { mapRequestToCommand } from './activation.mapper';
import { Config, Facility, RequestRecord, Section, STATUS } from './demo';
import { parseWorkspaceConfig, toReviewConfig } from './onboarding-config';

// ─────────────────────────────────────────────────────────────────────────────
// Facility identity and declared revenue operations at activation.
//
// A facility's FacilityCode is a stable internal identity; its name is the office's own. These pin that the code comes from
// the type the office chose, that an office's own facility takes a reserved custom slot (never another facility's code),
// that nothing is filed for a rate the office never stated, and that declared operations are shown to the operator without
// touching what activation sends.
// ─────────────────────────────────────────────────────────────────────────────

const daily = (rate = '30'): Section[] => [{ name: 'Gulayan', kind: 'VegetableArea', units: '10', rate, fees: [] }];

function fac(over: Partial<Facility> & Pick<Facility, 'name' | 'type'>): Facility {
  return {
    rateAmount: '',
    rateUnit: 'per month',
    unitLabel: 'units',
    units: '',
    sections: [],
    addOns: [],
    ...over,
  };
}

const market = (name = 'Carrascal Public Market', over: Partial<Facility> = {}) =>
  fac({ name, type: 'Daily stall', catalogKey: 'public_market', sections: daily(), ...over });
const rental = (name: string, catalogKey: string, over: Partial<Facility> = {}) =>
  fac({ name, type: catalogKey === 'other' ? 'Custom' : 'Monthly rental', catalogKey, ...over });

function request(config: Partial<Config> & { facilities: Facility[] }): RequestRecord {
  return {
    id: 'r1',
    municipality: 'Carrascal',
    province: 'Surigao del Sur',
    facilitiesManaged: '',
    requestingOffice: 'Carrascal Economic Enterprise Office',
    focalPerson: 'Juan Cruz',
    position: 'Head',
    officialEmail: 'head@carrascal.gov.ph',
    contactNumber: '09000000000',
    approxVendors: '40',
    authorizationStatus: 'Authorized',
    acknowledged: true,
    notes: '',
    submittedAt: '2026-10-01',
    status: STATUS.APPROVED,
    stage: 'Activation',
    activated: false,
    decisionMessage: '',
    onboardingLink: '',
    log: [],
    config: { orSeries: '', users: [], ...config },
  } as RequestRecord;
}

const codesOf = (r: RequestRecord) => mapRequestToCommand(r).command.facilities.map((f) => f.code);

describe('activation mapper: facility identity', () => {
  it('maps one ordinary facility from the type the office chose, keeping its own name', () => {
    const { command, blockingErrors } = mapRequestToCommand(request({ facilities: [market('Carrascal Pamilihan')] }));
    expect(blockingErrors).toEqual([]);
    expect(command.facilities).toHaveLength(1);
    expect(command.facilities[0]).toMatchObject({ code: 'NPM', name: 'Carrascal Pamilihan', archetype: 'DailyStall' });
  });

  it('maps several distinct facilities to distinct codes and keeps every local name', () => {
    const r = request({
      facilities: [
        market(),
        rental('Plaza Tindahan', 'commercial'),
        fac({ name: 'Pantalan Terminal', type: 'Per trip', catalogKey: 'terminal', rateAmount: '25' }),
      ],
    });
    const { command, blockingErrors } = mapRequestToCommand(r);
    expect(blockingErrors).toEqual([]);
    expect(command.facilities.map((f) => [f.code, f.name])).toEqual([
      ['NPM', 'Carrascal Public Market'],
      ['TCC', 'Plaza Tindahan'],
      ['TRM', 'Pantalan Terminal'],
    ]);
  });

  it("files an office's own facility under a reserved custom slot as a monthly rental — never another facility's code", () => {
    const r = request({
      facilities: [rental('Night Market', 'other'), rental('Fiesta Hall', 'other'), market()],
    });
    const { command, blockingErrors } = mapRequestToCommand(r);
    expect(blockingErrors).toEqual([]);
    const custom = command.facilities.filter((f) => f.name !== 'Carrascal Public Market');
    expect(custom.map((f) => f.code)).toEqual(['Custom1', 'Custom2']);
    expect(custom.every((f) => f.archetype === 'MonthlyRental')).toBe(true);
    // No standard facility code was handed to either of them.
    expect(codesOf(r)).not.toContain('TCC');
  });

  it('a custom facility takes no rate: rent is set per space after activation', () => {
    const r = request({ facilities: [rental('Night Market', 'other', { rateAmount: '1500' })] });
    const { command, warnings } = mapRequestToCommand(r);
    expect(command.rates).toEqual([]);
    expect(warnings.join(' ')).toMatch(/not filed/);
  });

  it('refuses a sixth custom facility with an actionable message instead of misfiling it', () => {
    const six = Array.from({ length: 6 }, (_, i) => rental(`Space ${i + 1}`, 'other'));
    const { command, blockingErrors } = mapRequestToCommand(request({ facilities: six }));
    expect(command.facilities.map((f) => f.code)).toEqual(['Custom1', 'Custom2', 'Custom3', 'Custom4', 'Custom5']);
    expect(blockingErrors).toHaveLength(1);
    expect(blockingErrors[0]).toMatch(/5 reserved slots/);
    // Honest: Add Facility shares the slots, so the message must not promise a later route.
    expect(blockingErrors[0]).toMatch(/cannot be added there later/);
  });

  it('refuses two facilities of one standard type rather than re-coding the second', () => {
    const r = request({ facilities: [market('First Market'), market('Second Market')] });
    const { command, blockingErrors } = mapRequestToCommand(r);
    expect(command.facilities.map((f) => f.code)).toEqual(['NPM']);
    expect(blockingErrors[0]).toMatch(/resolve to NPM/);
  });

  it('refuses a facility type the console does not recognise', () => {
    const { blockingErrors } = mapRequestToCommand(
      request({ facilities: [fac({ name: 'Mystery', type: 'Daily stall', catalogKey: 'mystery' })] }),
    );
    expect(blockingErrors[0]).toMatch(/does not recognise/);
  });

  it('refuses a facility whose billing type contradicts its identity', () => {
    const { blockingErrors } = mapRequestToCommand(
      request({ facilities: [fac({ name: 'Pamilihan', type: 'Per trip', catalogKey: 'public_market' })] }),
    );
    expect(blockingErrors[0]).toMatch(/is a NPM facility/);
  });

  describe('drafts saved before the facility type was recorded', () => {
    it('still reads a recognisable one, and says it was inferred', () => {
      const legacy = fac({ name: 'Tampak Commercial Center', type: 'Monthly rental' });
      const { command, warnings } = mapRequestToCommand(request({ facilities: [legacy] }));
      expect(command.facilities[0].code).toBe('TCC');
      expect(warnings.join(' ')).toMatch(/read as TCC/);
    });

    it('files an unrecognisable monthly rental as its own facility, not as TCC', () => {
      const legacy = fac({ name: 'Night Market', type: 'Monthly rental' });
      const { command } = mapRequestToCommand(request({ facilities: [legacy] }));
      expect(command.facilities[0]).toMatchObject({ code: 'Custom1', archetype: 'MonthlyRental' });
    });

    it('moves a repeated monthly rental to a custom slot but refuses a repeated slaughterhouse', () => {
      const twoRentals = mapRequestToCommand(
        request({ facilities: [fac({ name: 'Commercial Center A', type: 'Monthly rental' }), fac({ name: 'Commercial Center B', type: 'Monthly rental' })] }),
      );
      expect(twoRentals.command.facilities.map((f) => f.code)).toEqual(['TCC', 'Custom1']);

      const slh = (name: string) =>
        fac({ name, type: 'Per head', slaughterhouse: { hogLabel: 'Hog', hogAmount: '250', carabaoLabel: 'Carabao', cowLabel: 'Cow', largeAnimalAmount: '365', customAnimals: [] } });
      expect(mapRequestToCommand(request({ facilities: [slh('A'), slh('B')] })).blockingErrors[0]).toMatch(/resolve to SLH/);
    });

    it('refuses an unrecognised billing type instead of sending it as Custom', () => {
      const { blockingErrors } = mapRequestToCommand(request({ facilities: [fac({ name: 'Odd', type: 'Per widget' })] }));
      expect(blockingErrors[0]).toMatch(/unrecognised billing type/);
    });
  });
});

describe('activation mapper: rates that were never stated', () => {
  it('files no electricity or water row, and surfaces an amount the office did state', () => {
    const addOns = [
      { id: 'a', label: 'Electricity', basis: 'Per consumption', amount: '', unit: 'per month', mode: 'Selected stalls' },
      { id: 'b', label: 'Water', basis: 'Fixed amount', amount: '150', unit: 'per month', mode: 'All stalls' },
    ];
    const { command, warnings } = mapRequestToCommand(request({ facilities: [market('Carrascal Public Market', { addOns })] }));
    const keys = command.rates.map((x) => x.key);
    expect(keys).not.toContain('ElecPerKwh');
    expect(keys).not.toContain('WaterPerCubicMeter');
    expect(warnings.filter((w) => /Water/.test(w))).toHaveLength(1);
    expect(warnings.filter((w) => /Electricity/.test(w))).toHaveLength(0);
  });

  it.each([
    ['a market with no priced area', () => market('M', { sections: daily('') }), /no daily rate/],
    ['a terminal with no per-trip rate', () => fac({ name: 'T', type: 'Per trip', catalogKey: 'terminal' }), /no per-trip rate/],
    ['a weekly market with no vendor rate', () => fac({ name: 'W', type: 'Weekly market', catalogKey: 'weekly' }), /market-day rate/],
    [
      'a slaughterhouse with no hog rate',
      () =>
        fac({
          name: 'S',
          type: 'Per head',
          catalogKey: 'slaughterhouse',
          slaughterhouse: { hogLabel: 'Hog', hogAmount: '', carabaoLabel: 'Carabao', cowLabel: 'Cow', largeAnimalAmount: '365', customAnimals: [] },
        }),
      /no hog per-head rate/,
    ],
  ])('blocks %s instead of filing a zero', (_name, build, message) => {
    const { blockingErrors, command } = mapRequestToCommand(request({ facilities: [build()] }));
    expect(blockingErrors.join(' ')).toMatch(message);
    expect(command.rates.some((r) => r.amount === 0)).toBe(false);
  });
});

describe('activation mapper: declared revenue operations', () => {
  const base = () => request({ facilities: [market()] });
  const withOps = (items: unknown[]) =>
    request(toReviewConfig({ facilities: [market()], operations: { version: 1, items } }));

  it('shows what the office declared, in neutral wording plus its own local name', () => {
    const { declaredOperations } = mapRequestToCommand(
      withOps([
        { operationCode: 'FIESTA_ARAW_LOT_RENTAL', selected: true, localDisplayName: 'Pista Lot Rental' },
        { operationCode: 'ECF', selected: true },
        { operationCode: 'WCF', selected: false },
      ]),
    );
    expect(declaredOperations).toEqual([
      { code: 'FIESTA_ARAW_LOT_RENTAL', label: 'Event / Temporary Lot Rental', group: 'space', localName: 'Pista Lot Rental' },
      { code: 'ECF', label: 'Electricity Consumption Fees', group: 'utility', localName: null },
    ]);
  });

  it('declares ECF without WCF and WCF without ECF independently', () => {
    expect(mapRequestToCommand(withOps([{ operationCode: 'ECF', selected: true }])).declaredOperations.map((o) => o.code)).toEqual(['ECF']);
    expect(mapRequestToCommand(withOps([{ operationCode: 'WCF', selected: true }])).declaredOperations.map((o) => o.code)).toEqual(['WCF']);
  });

  it('carries the declaration into the command as configuration - and never blocks activation or touches anything else', () => {
    const plain = mapRequestToCommand(base());
    const declared = mapRequestToCommand(
      withOps(
        ['FISH_MEAT_VENDOR_FEE', 'WEIGHT_AND_MEASURE', 'KANMANGGAY_SPACE_RENTAL', 'ECF', 'WCF'].map((operationCode) => ({
          operationCode,
          selected: true,
          localDisplayName: operationCode === 'KANMANGGAY_SPACE_RENTAL' ? 'Municipal Plaza Rental' : undefined,
        })),
      ),
    );
    // Everything except the declarations is exactly what the same draft sent without them.
    const { operationDeclarations, ...rest } = declared.command;
    expect(rest).toEqual(plain.command);
    expect(operationDeclarations).toEqual([
      { operationCode: 'FISH_MEAT_VENDOR_FEE', selected: true },
      { operationCode: 'WEIGHT_AND_MEASURE', selected: true },
      { operationCode: 'KANMANGGAY_SPACE_RENTAL', selected: true, localDisplayName: 'Municipal Plaza Rental' },
      { operationCode: 'ECF', selected: true },
      { operationCode: 'WCF', selected: true },
    ]);
    expect(declared.blockingErrors).toEqual([]);
  });

  it('distinguishes never asked, explicitly nothing, and an explicit unselection', () => {
    // A draft saved before declarations existed: no field at all, so the municipality stays on the legacy fallback.
    expect(mapRequestToCommand(base()).command.operationDeclarations).toBeUndefined();
    // The workspace saved a block with nothing selected: an explicit empty list, which the server reads as "chose none".
    expect(mapRequestToCommand(withOps([])).command.operationDeclarations).toEqual([]);
    // An unselected operation is sent as unselected and carries no name.
    const unselected = mapRequestToCommand(withOps([{ operationCode: 'LANDING_BERTHING', selected: false, localDisplayName: 'Pantalan' }]));
    expect(unselected.command.operationDeclarations).toEqual([{ operationCode: 'LANDING_BERTHING', selected: false }]);
  });

  it('refuses to activate over a block it cannot read, rather than sending an empty list that would unlist everything', () => {
    const newer = request(toReviewConfig({ facilities: [market()], operations: { version: 2, items: [{ code: 'WCF' }] } }));
    const { command, blockingErrors } = mapRequestToCommand(newer);
    expect(command.operationDeclarations).toBeUndefined();
    expect(blockingErrors.join(' ')).toMatch(/cannot read/);
  });

  it('reads a draft saved before declarations existed as nothing declared', () => {
    const wc = parseWorkspaceConfig(JSON.stringify({ facilities: [market()], administrator: { name: 'A', email: 'a@x.ph' } }));
    const review = toReviewConfig(wc);
    expect(review.operations).toEqual([]);
    expect(review.operationProblems).toEqual([]);
    expect(review.facilities).toHaveLength(1);
  });

  it('reports an unreadable declaration as a warning and keeps the rest', () => {
    const r = withOps([{ operationCode: 'Kanmanggay Space Rental', selected: true }, { operationCode: 'WCF', selected: true }]);
    const { warnings, declaredOperations, blockingErrors } = mapRequestToCommand(r);
    expect(warnings.join(' ')).toMatch(/not a revenue operation StallTrack recognises/);
    expect(declaredOperations.map((o) => o.code)).toEqual(['WCF']);
    expect(blockingErrors).toEqual([]);
  });

  it('drops an overlong local name rather than carrying it', () => {
    const r = withOps([{ operationCode: 'WCF', selected: true, localDisplayName: 'x'.repeat(81) }]);
    const { declaredOperations, warnings } = mapRequestToCommand(r);
    expect(declaredOperations).toEqual([]);
    expect(warnings.join(' ')).toMatch(/longer than 80/);
  });
});
