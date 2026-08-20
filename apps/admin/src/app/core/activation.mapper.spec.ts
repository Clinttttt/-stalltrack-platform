import { mapRequestToCommand } from './activation.mapper';
import { Config, Facility, RequestRecord, Section, STATUS } from './demo';

// ─────────────────────────────────────────────────────────────────────────────
// What an LGU's market sections become when the operator commits an activation.
//
// Reported from use: Madrid named its market areas Gulayan, Isda and Karne. The console decided which area a
// section was by looking for the English words "fish" and "meat" in its name, and picked the per-kilo weighing
// fee out by looking for "kilo" or "fish" in the FEE's name. Madrid matched neither, so its fish and meat areas
// were dropped and its weighing fee was never seeded at all - a money figure lost to a spelling.
//
// The LGU now declares the collection area each of its sections is, and that declaration is the only thing read.
// ─────────────────────────────────────────────────────────────────────────────

function section(name: string, kind: Section['kind'], rate: string, perKilo?: string): Section {
  return {
    name,
    kind,
    units: '10',
    rate,
    fees: perKilo === undefined ? [] : [{ label: 'Fish (per kilo)', amount: perKilo, unit: 'per kilo' }],
  };
}

function market(sections: Section[]): Facility {
  return {
    name: 'Madrid Public Market',
    type: 'Daily stall',
    rateAmount: '',
    rateUnit: 'per day',
    unitLabel: 'stalls',
    units: '',
    sections,
    addOns: [],
    rateItems: [],
  };
}

function request(config: Config): RequestRecord {
  return {
    id: 'r1',
    municipality: 'Madrid',
    province: 'Surigao del Sur',
    facilitiesManaged: 'Public Market',
    requestingOffice: 'Madrid Economic Enterprise Office',
    focalPerson: 'Juan Cruz',
    position: 'Head',
    officialEmail: 'head@madrid.gov.ph',
    contactNumber: '09000000000',
    approxVendors: '40',
    authorizationStatus: 'Authorized',
    acknowledged: true,
    notes: '',
    submittedAt: '2026-08-20',
    status: STATUS.APPROVED,
    stage: 'Activation',
    activated: false,
    decisionMessage: '',
    onboardingLink: '',
    log: [],
    config,
  } as RequestRecord;
}

function configOf(sections: Section[]): Config {
  return { facilities: [market(sections)], orSeries: '', users: [] };
}

describe('activation mapper: market collection areas', () => {
  it("carries the LGU's own names to the area it declared, whatever language they are in", () => {
    const { command } = mapRequestToCommand(
      request(
        configOf([
          section('Gulayan', 'VegetableArea', '30'),
          section('Isda', 'FishSection', '30', '1'),
          section('Karne', 'MeatSection', '30'),
        ]),
      ),
    );

    const npm = command.facilities.find((f) => f.code === 'NPM');
    expect(npm?.sectionLabels).toEqual({ vegetable: 'Gulayan', fish: 'Isda', meat: 'Karne' });
  });

  it('seeds the per-kilo weighing fee for a fish area that is not called "fish"', () => {
    const { command } = mapRequestToCommand(
      request(configOf([section('Gulayan', 'VegetableArea', '30'), section('Isda', 'FishSection', '30', '2')])),
    );

    const perKilo = command.rates.find((r) => r.key === 'NpmFishPerKilo');
    expect(perKilo?.amount).toBe(2);
  });

  it('never reads an area out of a section\'s wording', () => {
    // Plainly English names, declared as the opposite areas. The declaration wins; the words say nothing.
    const { command } = mapRequestToCommand(
      request(configOf([section('Fish', 'MeatSection', '30'), section('Meat', 'FishSection', '30', '1')])),
    );

    const npm = command.facilities.find((f) => f.code === 'NPM');
    expect(npm?.sectionLabels?.meat).toBe('Fish');
    expect(npm?.sectionLabels?.fish).toBe('Meat');
  });

  it('fills areas in entry order for a draft saved before the question was asked, and says so', () => {
    const legacy: Section[] = [
      { name: 'Gulayan', units: '10', rate: '30', fees: [] },
      { name: 'Isda', units: '10', rate: '30', fees: [{ label: 'Fish (per kilo)', amount: '1', unit: 'per kilo' }] },
      { name: 'Karne', units: '10', rate: '30', fees: [] },
    ];

    const { command, warnings } = mapRequestToCommand(request(configOf(legacy)));

    const npm = command.facilities.find((f) => f.code === 'NPM');
    expect(npm?.sectionLabels).toEqual({ vegetable: 'Gulayan', fish: 'Isda', meat: 'Karne' });
    // A legacy draft still seeds the weighing fee rather than silently losing it.
    expect(command.rates.find((r) => r.key === 'NpmFishPerKilo')?.amount).toBe(1);
    expect(warnings.some((w) => w.includes('before onboarding asked'))).toBe(true);
  });

  it('warns when a declared fish area states no weighing fee', () => {
    const { warnings } = mapRequestToCommand(
      request(configOf([section('Gulayan', 'VegetableArea', '30'), section('Isda', 'FishSection', '30', '')])),
    );

    expect(warnings.some((w) => w.includes('no per-kilo weighing fee'))).toBe(true);
  });

  it('leaves a non-market facility without section labels', () => {
    const slaughterhouse: Facility = {
      name: 'Madrid Slaughterhouse',
      type: 'Per head',
      rateAmount: '',
      rateUnit: 'per head',
      unitLabel: 'heads',
      units: '',
      sections: [],
      addOns: [],
      rateItems: [{ label: 'Hog', amount: '200' }],
    };

    const { command } = mapRequestToCommand(
      request({ facilities: [slaughterhouse], orSeries: '', users: [] }),
    );

    expect(command.facilities.find((f) => f.code === 'SLH')?.sectionLabels).toBeUndefined();
  });
});
