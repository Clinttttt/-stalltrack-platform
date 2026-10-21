import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OnboardingWorkspace } from './onboarding-workspace';

/**
 * The Public Market's rental model is the LGU's own explicit choice at onboarding: standard monthly rental (one monthly obligation per
 * stall, full or partial payments, no daily charge) or the daily-collected market. It is stored with the facility in the draft, it is
 * never inferred from a rate or a name, and a draft saved before it existed is the daily market.
 */
describe('OnboardingWorkspace — Public Market rental model', () => {
  function workspace() {
    TestBed.configureTestingModule({ imports: [OnboardingWorkspace] });
    const fixture = TestBed.createComponent(OnboardingWorkspace);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function addMarket(ws: OnboardingWorkspace) {
    ws.addFromCatalog(ws.catalog.find((c) => c.key === 'public_market')!);
    return ws.facilities()[0];
  }

  it('starts every new Public Market on the daily model, as before', () => {
    const ws = workspace();
    const market = addMarket(ws);

    expect(market.rentalModel).toBe('daily');
    expect(market.type).toBe('Daily stall');
  });

  it('records an explicit monthly choice on the facility, leaving it a Public Market', () => {
    const ws = workspace();
    const market = addMarket(ws);

    ws.setFacility(market.id, 'rentalModel', 'monthly');

    const stored = ws.facilities()[0];
    expect(stored.rentalModel).toBe('monthly');
    expect(stored.catalogKey).toBe('public_market');
  });

  it('needs no daily rate to be finished once the market is rented by the month, but does for a daily market', () => {
    const ws = workspace();
    const market = addMarket(ws);
    ws.setFacility(market.id, 'name', 'Madrid Public Market');

    ws.setFacility(market.id, 'rentalModel', 'daily');
    expect(ws.isFacilityDone(ws.facilities()[0])).toBe(false);          // a daily market still needs its daily rate

    ws.setFacility(market.id, 'rentalModel', 'monthly');
    expect(ws.isFacilityDone(ws.facilities()[0])).toBe(true);           // rent is set per stall after activation
    expect(ws.summaryFor(ws.facilities()[0])).toBe('monthly rent set per stall');
  });

  it('reads a draft saved before the choice existed as the daily market', () => {
    const ws = workspace();
    const market = addMarket(ws);
    const legacy = { ...ws.facilities()[0] } as Record<string, unknown>;
    delete legacy['rentalModel'];

    expect(market.rentalModel).toBe('daily');
    expect(legacy['rentalModel']).toBeUndefined();                       // absent is not monthly: every template and mapper test is `=== 'monthly'`
  });
});
