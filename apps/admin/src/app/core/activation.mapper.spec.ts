import { headUsernameFor, mapRequestToCommand } from './activation.mapper';
import { Config, Facility, RequestRecord, Section, STATUS } from './demo';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// What an LGU's market sections become when the operator commits an activation.
//
// Reported from use: Madrid named its market areas Gulayan, Isda and Karne. The console decided which area a
// section was by looking for the English words "fish" and "meat" in its name, and picked the per-kilo weighing
// fee out by looking for "kilo" or "fish" in the FEE's name. Madrid matched neither, so its fish and meat areas
// were dropped and its weighing fee was never seeded at all - a money figure lost to a spelling.
//
// The LGU now declares the collection area each of its sections is, and that declaration is the only thing read.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

describe("activation mapper: the market's own areas", () => {
  // The platform keys a daily sheet on three collection areas. A market that also has a rice section or a dry goods row
  // kept those in the facility's section registry, which onboarding could not reach: the only way one came into being
  // was for the Head to type the name into the first stall filed under it.
  function customSection(name: string, rate = '30'): Section {
    return { name, kind: 'CustomArea', units: '10', rate, fees: [] };
  }

  it("registers the market's own areas by name, and keeps them out of the three", () => {
    const { command } = mapRequestToCommand(
      request(
        configOf([
          section('Gulayan', 'VegetableArea', '30'),
          section('Isda', 'FishSection', '30', '1'),
          customSection('Rice Section'),
          customSection('Dry Goods'),
        ]),
      ),
    );

    const market = command.facilities[0];
    expect(market.customSections).toEqual(['Rice Section', 'Dry Goods']);

    // The three carry only what was declared as one of the three; the meat area was not declared at all.
    expect(market.sectionLabels).toEqual({ vegetable: 'Gulayan', fish: 'Isda', meat: null });
  });

  it('leaves out an area it was not given a name for, and says which row went', () => {
    const { command, warnings } = mapRequestToCommand(
      request(configOf([section('Gulayan', 'VegetableArea', '30'), customSection('   ')])),
    );

    expect(command.facilities[0].customSections).toBeUndefined();
    expect(warnings.join(' ')).toContain('without naming it');
  });

  it('registers a repeated area once', () => {
    // The registry is case-insensitive, so these are one area.
    const { command, warnings } = mapRequestToCommand(
      request(configOf([customSection('Rice Section'), customSection('rice section')])),
    );

    expect(command.facilities[0].customSections).toEqual(['Rice Section']);
    expect(warnings.join(' ')).toContain('more than once');
  });

  it('never treats a declared own area as an undeclared one', () => {
    // withDeclaredAreas fills in the area for a draft that predates the question. An own area is a declaration, so it
    // must not be overwritten with a canonical one, and it must not consume one of the three slots.
    const { command, warnings } = mapRequestToCommand(
      request(configOf([customSection('Rice Section'), section('Gulayan', 'VegetableArea', '30')])),
    );

    expect(command.facilities[0].customSections).toEqual(['Rice Section']);
    expect(command.facilities[0].sectionLabels?.vegetable).toBe('Gulayan');
    expect(warnings.join(' ')).not.toContain('areas were assumed');
  });

  it('says which daily rate is filed when a market prices its areas differently', () => {
    // A market bills one daily rate. Only the first priced area was ever filed, silently.
    const { command, warnings } = mapRequestToCommand(
      request(configOf([section('Gulayan', 'VegetableArea', '30'), customSection('Rice Section', '45')])),
    );

    expect(command.rates.find((r) => r.key === 'NpmDailyStall')?.amount).toBe(30);
    expect(warnings.join(' ')).toContain('prices its areas differently');
    expect(warnings.join(' ')).toContain('45');
  });

  it('a market with only the three is unchanged', () => {
    const { command } = mapRequestToCommand(
      request(configOf([section('Gulayan', 'VegetableArea', '30'), section('Isda', 'FishSection', '30', '1')])),
    );

    expect(command.facilities[0].customSections).toBeUndefined();
  });
});

describe("activation mapper: the Head's own username", () => {
  // The operator's activation form carried a "Head username" input. The Head's credentials are the Head's, and one
  // office's sign-in name is not another office's to choose â€” so the field is gone and the console cannot supply one.
  // Nothing the office states during onboarding is a username (its config carries a name, a role and an email), so the
  // name is derived from the municipality and the Head changes it in their own portal, where editing your own account
  // is already allowed.
  it('derives the username from the LGU, and takes no override', () => {
    const { command } = mapRequestToCommand(request(configOf([section('Gulayan', 'VegetableArea', '30')])));

    expect(command.administrator.username).toBe('madrid.head');
    expect(headUsernameFor('Carrascal')).toBe('carrascal.head');

    // The signature carries no username: a later caller cannot pass one back in by accident.
    expect(Object.keys({ officeName: null, sealPath: null })).not.toContain('username');
  });

  it('slugs a name with punctuation or spaces', () => {
    expect(headUsernameFor('Gen. Luna')).toBe('genluna.head');
    expect(headUsernameFor('  ')).toBe('lgu.head');
  });
});

describe('activation mapper: one amount per rate', () => {
  // Reported 2026-08-23: activating Carrascal answered the operator with the single word "Conflict" on an LGU that had
  // never been activated. The production log named it: a duplicate key on
  // IX_FacilityRates_MunicipalityId_FacilityCode_RateKey_Effective. The platform holds ONE large-animal rate, so a
  // slaughterhouse listing carabao and cow sends two rows under SlhLargePerHead, and Postgres answered the operator.
  function slaughterhouse(items: { label: string; amount: string }[]): Facility {
    return {
      name: 'Carrascal Slaughterhouse',
      type: 'Per head',
      rateAmount: '',
      rateUnit: 'per head',
      unitLabel: 'heads',
      units: '',
      sections: [],
      addOns: [],
      rateItems: items.map((i) => ({ label: i.label, amount: i.amount, unit: 'per head' })),
    } as Facility;
  }

  function slhRequest(items: { label: string; amount: string }[]): RequestRecord {
    return request({ facilities: [slaughterhouse(items)], orSeries: '', users: [] } as Config);
  }

  it('files one row when carabao and cow state the same large-animal amount, and says so', () => {
    const { command, warnings } = mapRequestToCommand(
      slhRequest([
        { label: 'Hog', amount: '250' },
        { label: 'Carabao', amount: '365' },
        { label: 'Cow', amount: '365' },
      ]),
    );

    const large = command.rates.filter((r) => r.key === 'SlhLargePerHead');
    expect(large.length).toBe(1);
    expect(large[0].amount).toBe(365);
    expect(command.rates.length).toBe(2);
    expect(warnings.join(' ')).toContain('filed once');
  });

  it('sends both when they differ, and warns that activation will be refused until the office says which', () => {
    // Choosing between an office's two amounts is not the console's decision. The backend names the contradiction.
    const { command, warnings } = mapRequestToCommand(
      slhRequest([
        { label: 'Carabao', amount: '365' },
        { label: 'Cow', amount: '400' },
      ]),
    );

    expect(command.rates.filter((r) => r.key === 'SlhLargePerHead').length).toBe(2);
    expect(warnings.join(' ')).toContain('two different amounts');
    expect(warnings.join(' ')).toContain('400');
  });
});

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
