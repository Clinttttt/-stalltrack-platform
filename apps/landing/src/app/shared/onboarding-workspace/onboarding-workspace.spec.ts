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
  function workspace() {
    TestBed.configureTestingModule({ imports: [OnboardingWorkspace] });
    const fixture = TestBed.createComponent(OnboardingWorkspace);
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

  it('adds the first facility, since there is nothing unfinished to hold it', () => {
    const ws = workspace();

    ws.addFromCatalog(commercialCentre(ws));

    expect(ws.facilities().length).toBe(1);
  });

  it('refuses a second facility while the first has no rate', () => {
    const ws = workspace();
    ws.addFromCatalog(commercialCentre(ws));

    ws.addFromCatalog(iceplant(ws));

    // A catalogue facility arrives already named, so the rate is what is actually missing - and a named, unpriced facility is
    // the dangerous state: it looks configured on screen and bills nobody.
    expect(ws.facilities().length).toBe(1);
    expect(ws.unfinishedFacility()).not.toBeNull();
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
    ws.addFromCatalog(commercialCentre(ws));
    const first = ws.facilities()[0];

    // A catalogue facility arrives named, so the message can name it straight away.
    expect(ws.unfinishedFacilityLabel()).toBe('Commercial Center');

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
});
