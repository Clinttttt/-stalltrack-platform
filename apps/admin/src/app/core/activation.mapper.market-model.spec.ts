import { mapRequestToCommand } from './activation.mapper';
import { Config, Facility, RequestRecord, Section, STATUS } from './demo';

// ─────────────────────────────────────────────────────────────────────────────────────────────
// The Public Market rental model an LGU declares at onboarding, and what activation sends.
//
// STANDARD MONTHLY RENTAL (`rentalModel: 'monthly'`) files the market under its own NPM identity as a monthly-rental facility:
// no daily rate, no month basis, no market-wide monthly rate (rent is set per stall in the portal), its sections still registered.
// A draft that never stated a model is the daily-collected market every office onboarded before this existed, byte for byte.
// ─────────────────────────────────────────────────────────────────────────────────────────────

const sections = (rate = ''): Section[] => [
  { name: 'Gulayan', kind: 'VegetableArea', units: '10', rate, fees: [] },
  { name: 'Isda', kind: 'FishSection', units: '5', rate, fees: [{ label: 'Fish (per kilo)', amount: '6', unit: 'per kilo' }] },
  { name: 'Bigasan', kind: 'CustomArea', units: '4', rate, fees: [] },
];

function market(over: Partial<Facility> = {}): Facility {
  return {
    name: 'Madrid Public Market',
    type: 'Daily stall',
    catalogKey: 'public_market',
    rateAmount: '',
    rateUnit: 'per day',
    unitLabel: 'stalls',
    units: '',
    sections: sections('30'),
    addOns: [],
    ...over,
  } as Facility;
}

function request(...facilities: Facility[]): RequestRecord {
  return {
    id: 'r1',
    municipality: 'Madrid',
    province: 'Surigao del Sur',
    facilitiesManaged: '',
    requestingOffice: 'Madrid Economic Enterprise Office',
    focalPerson: 'Juan Cruz',
    position: 'Head',
    officialEmail: 'head@madrid.gov.ph',
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
    config: { orSeries: '', users: [], facilities } as Partial<Config>,
  } as RequestRecord;
}

describe('activation mapper: Public Market rental model', () => {
  it('files a monthly-only market as NPM + MonthlyRental with no daily or monthly-stall rate and no month basis', () => {
    const { command, blockingErrors } = mapRequestToCommand(request(market({ rentalModel: 'monthly', sections: sections(''), monthlyRent: '1500' })));
    expect(blockingErrors).toEqual([]);
    expect(command.facilities).toHaveLength(1);
    expect(command.facilities[0]).toMatchObject({ code: 'NPM', archetype: 'MonthlyRental', name: 'Madrid Public Market' });
    expect(command.facilities[0].monthBasis).toBeUndefined();
    const keys = command.rates.map((r) => r.key);
    expect(keys).not.toContain('NpmDailyStall');
    expect(keys).not.toContain('NpmDailyStallVegetable');
    expect(keys).not.toContain('NpmDailyStallFish');
    expect(keys).not.toContain('NpmMonthlyStall');            // a stated figure from before the choice is never filed as a market-wide rent
    expect(keys).toEqual(['NpmFishPerKilo']);                    // weighing is its own source and keeps its fee
  });

  it('keeps the market sections and the LGU names for them', () => {
    const { command } = mapRequestToCommand(request(market({ rentalModel: 'monthly', sections: sections('') })));
    expect(command.facilities[0].sectionLabels).toEqual({ vegetable: 'Gulayan', fish: 'Isda', meat: null });
    expect(command.facilities[0].customSections).toEqual(['Bigasan']);
  });

  it('does not require a daily rate for a monthly-only market', () => {
    const { blockingErrors } = mapRequestToCommand(request(market({ rentalModel: 'monthly', sections: sections('') })));
    expect(blockingErrors).toEqual([]);
  });

  it('keeps a daily market exactly as it always was, whether the model is stated or absent', () => {
    const absent = mapRequestToCommand(request(market()));
    const stated = mapRequestToCommand(request(market({ rentalModel: 'daily' })));
    for (const r of [absent, stated]) {
      expect(r.blockingErrors).toEqual([]);
      expect(r.command.facilities[0]).toMatchObject({ code: 'NPM', archetype: 'DailyStall', monthBasis: 'RentGoal' });
      expect(r.command.rates.map((x) => x.key)).toContain('NpmDailyStall');
    }
    expect(stated.command).toEqual(absent.command);
  });

  it('keeps calendar-day (PureDays) billing available for a genuinely daily-charged market', () => {
    const { command, blockingErrors } = mapRequestToCommand(request(market({ rentalModel: 'daily', monthBasis: 'PureDays' })));
    expect(blockingErrors).toEqual([]);
    expect(command.facilities[0]).toMatchObject({ archetype: 'DailyStall', monthBasis: 'PureDays' });
  });

  it('never converts the model silently: a rental model on another facility type is ignored and a daily type stays daily', () => {
    const tcc = mapRequestToCommand(request(
      { name: 'Madrid Commercial Center', type: 'Monthly rental', catalogKey: 'commercial', rateAmount: '', rateUnit: 'per month', unitLabel: 'spaces', units: '', sections: [], addOns: [], rentalModel: 'monthly' } as Facility,
    ));
    expect(tcc.command.facilities[0]).toMatchObject({ code: 'TCC', archetype: 'MonthlyRental' });
    const daily = mapRequestToCommand(request(market({ rentalModel: undefined, name: 'Monthly Rent Market' })));   // a name says nothing
    expect(daily.command.facilities[0].archetype).toBe('DailyStall');
  });
});
