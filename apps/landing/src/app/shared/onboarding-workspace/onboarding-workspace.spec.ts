import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OnboardingWorkspace } from './onboarding-workspace';

/**
 * An LGU configures one facility at a time.
 *
 * The workspace let an office press "Add facility" as often as it liked while every card on the page sat empty, so it could end
 * with a column of unnamed facilities and then have to work backwards through them. Worse, an unconfigured facility carries no
 * rate: it would reach the platform as a space nobody can be billed for, which is the kind of gap only discovered when a
 * collector stands in front of it.
 *
 * These pin both halves of the rule - the button refuses, and so does the handler behind it, because a disabled button is not a
 * guard.
 */
describe('OnboardingWorkspace — a facility must be finished before another is added', () => {
  function workspace(configJson?: string) {
    TestBed.configureTestingModule({ imports: [OnboardingWorkspace] });
    const fixture = TestBed.createComponent(OnboardingWorkspace);
    if (configJson) fixture.componentRef.setInput('configJson', configJson);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /** The catalogue entry for a monthly-rental facility, which is configured by a single base rate. */
  function commercialCentre(ws: OnboardingWorkspace) {
    return ws.catalog.find((c) => c.key === 'commercial')!;
  }

  function iceplant(ws: OnboardingWorkspace) {
    return ws.catalog.find((c) => c.key === 'iceplant')!;
  }

  /** The custom-facility entry, and the ONLY one that arrives without a name for the office to supply. */
  function customFacility(ws: OnboardingWorkspace) {
    return ws.catalog.find((c) => c.key === 'other')!;
  }

  it('adds custom Spaces with the same monthly billing contract and persists the category', () => {
    const ws = workspace();
    ws.addCustomSpace();
    const facility = ws.facilities()[0];
    expect(facility.catalogKey).toBe('other');
    expect(facility.customCategory).toBe('SpaceRental');
    expect(ws.groupOfFacility(facility)).toBe('space');
    expect(ws.showBaseRate(facility)).toBe(false);
    ws.setFacility(facility.id, 'name', 'Civic Plaza');
    expect(ws.isFacilityDone(ws.facilities()[0])).toBe(true);

    let draft = '';
    ws.saveDraft.subscribe((value) => draft = value);
    ws.saveProgress();
    expect(JSON.parse(draft).facilities[0].customCategory).toBe('SpaceRental');

    ws.setCustomCategory(facility.id, 'StallRent');
    expect(ws.groupOfFacility(ws.facilities()[0])).toBe('rent');
  });

  it('defaults legacy custom rental drafts to Stall Rent without deleting unrelated saved fields', () => {
    const custom = {
      id: 'old-custom', catalogKey: 'other', archetype: 'MonthlyRental',
      name: 'Old Hall', type: 'Custom', monthlyRent: '', rateAmount: '',
      monthBasis: 'RentGoal', rentalModel: 'daily', rateUnit: 'per month',
      unitLabel: 'stalls', units: '', ordinance: '', notes: '', marketDay: '',
      sections: [], addOns: [],
    };
    const ws = workspace(JSON.stringify({ facilities: [custom], extraCustomFutureField: 'preserve' }));
    expect(ws.groupOfFacility(ws.facilities()[0])).toBe('rent');
    let saved = '';
    ws.saveDraft.subscribe(value => saved = value);
    ws.saveProgress();
    expect(JSON.parse(saved).extraCustomFutureField).toBe('preserve');
  });

  it('no longer offers a Transport terminal facility to a new onboarding, and refuses to add one', () => {
    const ws = workspace();

    expect(ws.catalogInGroup('terminal')).toEqual([]);
    ws.addFromCatalog(terminal(ws));

    expect(ws.facilities().length).toBe(0);
    // The Terminal income sections stay: they are separate from the facility and from Transportation / Parking.
    expect(ws.terminalChoices().map((x) => x.section).length).toBe(3);
  });

  it('still reads, groups and keeps the rate of a saved draft that already holds a Transport terminal', () => {
    const trm = {
      id: 'old-trm', catalogKey: 'terminal', archetype: 'PerTrip', name: 'Transport', type: 'Per trip', monthlyRent: '', rateAmount: '30',
      monthBasis: 'RentGoal', rentalModel: 'daily', rateUnit: 'per trip', unitLabel: 'trips', units: '', ordinance: '', notes: '', marketDay: '',
      sections: [], addOns: [],
    };
    const ws = workspace(JSON.stringify({ facilities: [trm] }));

    expect(ws.facilities().length).toBe(1);
    expect(ws.groupOfFacility(ws.facilities()[0])).toBe('terminal');
    expect(ws.facilities()[0].rateAmount).toBe('30');
    let saved = '';
    ws.saveDraft.subscribe((value) => (saved = value));
    ws.saveProgress();
    expect(JSON.parse(saved).facilities[0]).toMatchObject({ catalogKey: 'terminal', rateAmount: '30' });
  });

  it('keeps Transportation / Parking as the one collection toggle, with its optional local name and no facility behind it', () => {
    const ws = workspace();

    ws.toggleOperation('TRANSPORTATION');
    ws.setOperationName('TRANSPORTATION', 'Parking fee');

    expect(ws.isOperationSelected('TRANSPORTATION')).toBe(true);
    expect(ws.operationName('TRANSPORTATION')).toBe('Parking fee');
    expect(ws.facilities().length).toBe(0);
  });

  it('adds the first facility, since there is nothing unfinished to hold it', () => {
    const ws = workspace();

    ws.addFromCatalog(commercialCentre(ws));

    expect(ws.facilities().length).toBe(1);
  });

  function terminal(ws: OnboardingWorkspace) {
    return ws.catalog.find((c) => c.key === 'terminal')!;
  }
  // The weekly (Tabo) market is the catalogue facility that keeps a facility-level rate the platform files, so it stands in for the
  // per-trip terminal these checks used before the terminal facility was retired from new onboarding.
  function weekly(ws: OnboardingWorkspace) {
    return ws.catalog.find((c) => c.key === 'weekly')!;
  }

  it('refuses a second facility while the first has no rate', () => {
    const ws = workspace();
    // A weekly market bills a per-vendor rate the platform files, so a named one with no rate is the dangerous state: it looks
    // configured on screen and bills nobody.
    ws.addFromCatalog(weekly(ws));

    ws.addFromCatalog(iceplant(ws));

    expect(ws.facilities().length).toBe(1);
    expect(ws.unfinishedFacility()).not.toBeNull();
  });

  it('does not ask a monthly rental for a facility-wide rate, since rent is set per space after activation', () => {
    const ws = workspace();
    ws.addFromCatalog(commercialCentre(ws));

    const f = ws.facilities()[0];
    expect(ws.showBaseRate(f)).toBe(false);
    expect(ws.isFacilityDone(f)).toBe(true);
    expect(ws.summaryFor(f)).toBe('rent set per space');
    // …and a weekly market still does, because that rate IS filed.
    ws.addFromCatalog(weekly(ws));
    expect(ws.showBaseRate(ws.facilities()[1])).toBe(true);
  });

  it('refuses a second facility while a custom one has no name', () => {
    const ws = workspace();
    ws.addFromCatalog(customFacility(ws));
    const custom = ws.facilities()[0];
    // Priced but unnamed: a custom facility is the one kind that arrives nameless, because only the office can say what it is.
    ws.setFacility(custom.id, 'rateAmount', '500');

    ws.addFromCatalog(iceplant(ws));

    expect(ws.facilities().length).toBe(1);
  });

  it('allows the next facility once the first is named and priced', () => {
    const ws = workspace();
    ws.addFromCatalog(commercialCentre(ws));
    const first = ws.facilities()[0];
    ws.setFacility(first.id, 'name', 'Tampak Commercial Center');
    ws.setFacility(first.id, 'rateAmount', '2400');

    expect(ws.unfinishedFacility()).toBeNull();

    ws.addFromCatalog(iceplant(ws));

    expect(ws.facilities().length).toBe(2);
  });

  it('names the facility that is holding things up, and falls back when it has no name yet', () => {
    const ws = workspace();
    ws.addFromCatalog(weekly(ws));
    const first = ws.facilities()[0];

    // A catalogue facility arrives named, so the message can name it straight away.
    expect(ws.unfinishedFacilityLabel()).toBe('Weekly');

    // Cleared, or a custom facility never named: the message cannot point at a name that does not exist.
    ws.setFacility(first.id, 'name', '   ');
    expect(ws.unfinishedFacilityLabel()).toBe('the facility above');
  });

  it('still refuses to add the same facility type twice', () => {
    const ws = workspace();
    ws.addFromCatalog(commercialCentre(ws));
    const first = ws.facilities()[0];
    ws.setFacility(first.id, 'name', 'Tampak Commercial Center');
    ws.setFacility(first.id, 'rateAmount', '2400');

    ws.addFromCatalog(commercialCentre(ws));

    // The older rule, unchanged: a non-custom type is configured once.
    expect(ws.facilities().length).toBe(1);
  });

  it('does not consider a custom animal with an amount but no name complete', () => {
    const ws = workspace();
    const slaughterhouse = ws.catalog.find((c) => c.key === 'slaughterhouse')!;
    ws.addFromCatalog(slaughterhouse);
    const facility = ws.facilities()[0];
    ws.setSlaughterhouse(facility.id, 'hogAmount', '352');
    ws.setSlaughterhouse(facility.id, 'largeAnimalAmount', '351');
    ws.addCustomAnimal(facility.id);
    const custom = ws.facilities()[0].slaughterhouse!.customAnimals[0];
    ws.setCustomAnimal(facility.id, custom.id, 'amount', '252');

    expect(ws.isFacilityDone(ws.facilities()[0])).toBe(false);
  });

  it('hydrates a Carmen-style legacy draft into explicit semantics and re-saves without free-text rateItems', () => {
    const legacy = JSON.stringify({
      facilities: [
        {
          id: 'slh-1',
          catalogKey: 'slaughterhouse',
          archetype: 'PerHead',
          name: 'Carmen Slaughterhouse',
          type: 'Per head',
          rateAmount: '',
          monthlyRent: '',
          monthBasis: 'RentGoal',
          rateUnit: 'per head',
          unitLabel: 'heads',
          units: '',
          ordinance: '',
          notes: '',
          marketDay: '',
          sections: [],
          addOns: [],
          rateItems: [
            { id: 'h', label: 'Carmen Hog', amount: '352' },
            { id: 'c', label: 'Carmen Carabao', amount: '351' },
            { id: 'g', label: 'Carmen Goat', amount: '252' },
          ],
        },
      ],
      administrator: {},
      branding: {},
    });
    const ws = workspace(legacy);
    const slh = ws.facilities()[0].slaughterhouse!;

    expect(slh.hogLabel).toBe('Carmen Hog');
    expect(slh.hogAmount).toBe('352');
    expect(slh.carabaoLabel).toBe('Carmen Carabao');
    expect(slh.largeAnimalAmount).toBe('351');
    expect(slh.customAnimals.map((a) => [a.label, a.amount])).toEqual([['Carmen Goat', '252']]);
    expect(slh.legacyReviewRequired).not.toBe(true);

    let saved = '';
    ws.saveDraft.subscribe((json) => (saved = json));
    ws.saveProgress();
    const parsed = JSON.parse(saved);
    expect(parsed.facilities[0].rateItems).toBeUndefined();
    expect(parsed.facilities[0].slaughterhouse.hogLabel).toBe('Carmen Hog');
  });

  it('holds a conflicting legacy Carabao/Cow draft for review', () => {
    const legacy = JSON.stringify({
      facilities: [
        {
          id: 'slh-1',
          name: 'Legacy Slaughterhouse',
          type: 'Per head',
          sections: [],
          addOns: [],
          rateItems: [
            { id: 'c1', label: 'Carabao', amount: '351' },
            { id: 'c2', label: 'Cow', amount: '400' },
          ],
        },
      ],
    });
    const ws = workspace(legacy);

    expect(ws.facilities()[0].slaughterhouse?.legacyReviewRequired).toBe(true);
    expect(ws.isFacilityDone(ws.facilities()[0])).toBe(false);
  });
});
