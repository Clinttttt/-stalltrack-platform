import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OnboardingWorkspace } from './onboarding-workspace';

/**
 * Revenue operations are declared, optional, and carried in a versioned block of the saved document. They are initial intent
 * only; the block must never disturb a draft saved without it, and a save must not strip fields it does not own.
 */
describe('OnboardingWorkspace — declared revenue operations', () => {
  function workspace(configJson?: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [OnboardingWorkspace] });
    const fixture = TestBed.createComponent(OnboardingWorkspace);
    if (configJson) fixture.componentRef.setInput('configJson', configJson);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const saved = (ws: OnboardingWorkspace) => {
    let json = '';
    const sub = ws.saveDraft.subscribe((j) => (json = j));
    ws.saveProgress();
    sub.unsubscribe();
    return JSON.parse(json);
  };

  const codes = (doc: { operations: { items: Array<{ operationCode: string }> } }) =>
    doc.operations.items.map((i) => i.operationCode);

  const versionless = JSON.stringify({
    facilities: [
      {
        id: 'm1',
        catalogKey: 'public_market',
        archetype: 'DailyStall',
        name: 'Carmen Public Market',
        type: 'Daily stall',
        rateAmount: '',
        monthlyRent: '',
        monthBasis: 'RentGoal',
        rateUnit: 'per day',
        unitLabel: 'stalls',
        units: '',
        ordinance: '',
        notes: '',
        marketDay: '',
        addOns: [{ id: 'a1', label: 'Water', basis: 'Fixed amount', amount: '150', unit: 'per month', mode: 'All stalls' }],
        sections: [{ id: 's1', name: 'Gulayan', kind: 'VegetableArea', units: '10', rate: '30', fees: [] }],
      },
    ],
    administrator: { name: 'Ana Cruz', position: 'Head', email: 'ana@carmen.gov.ph' },
    branding: { officeName: 'Carmen EEMO', orPrefix: 'OR-', orStart: '1', logoName: '', logoDataUri: '' },
  });

  it('loads a draft saved before operations existed, with nothing selected and everything else intact', () => {
    const ws = workspace(versionless);

    expect(ws.selectedOperationCount()).toBe(0);
    expect(ws.operationsValid()).toBe(true);
    expect(ws.facilities()[0].name).toBe('Carmen Public Market');
    expect(ws.facilities()[0].sections[0].name).toBe('Gulayan');
    expect(ws.admin().email).toBe('ana@carmen.gov.ph');
    expect(ws.branding().officeName).toBe('Carmen EEMO');
    // An add-on the older draft held survives a re-save, so nothing the office typed is lost.
    expect(saved(ws).facilities[0].addOns).toHaveLength(1);
  });

  it('writes a versioned block with stable codes, and round-trips selections and local names', () => {
    const ws = workspace(versionless);
    ws.toggleOperation('FIESTA_ARAW_LOT_RENTAL');
    ws.setOperationName('FIESTA_ARAW_LOT_RENTAL', '  Pista Lot Rental ');
    ws.toggleOperation('ECF');

    const doc = saved(ws);
    expect(doc.operations).toEqual({
      version: 1,
      items: [
        { operationCode: 'FIESTA_ARAW_LOT_RENTAL', selected: true, localDisplayName: 'Pista Lot Rental' },
        { operationCode: 'ECF', selected: true },
      ],
    });

    const reloaded = workspace(JSON.stringify(doc));
    expect(reloaded.isOperationSelected('FIESTA_ARAW_LOT_RENTAL')).toBe(true);
    expect(reloaded.operationName('FIESTA_ARAW_LOT_RENTAL')).toBe('Pista Lot Rental');
    expect(reloaded.isOperationSelected('ECF')).toBe(true);
    expect(reloaded.isOperationSelected('WCF')).toBe(false);
  });

  it('keeps a typed local name when an operation is switched off and back on', () => {
    const ws = workspace();
    ws.toggleOperation('WCF');
    ws.setOperationName('WCF', 'Tubig');
    ws.toggleOperation('WCF');

    expect(saved(ws).operations.items).toEqual([{ operationCode: 'WCF', selected: false, localDisplayName: 'Tubig' }]);
    ws.toggleOperation('WCF');
    expect(ws.operationName('WCF')).toBe('Tubig');
  });

  it('selects nothing by default, and declares ECF without WCF independently', () => {
    const ws = workspace();
    expect(saved(ws).operations).toEqual({ version: 1, items: [] });

    ws.toggleOperation('ECF');
    expect(codes(saved(ws))).toEqual(['ECF']);
  });

  it('preserves top-level fields it does not own', () => {
    const doc = { ...JSON.parse(versionless), coordinatorNote: { reviewed: true }, futureField: [1, 2] };
    const ws = workspace(JSON.stringify(doc));

    const out = saved(ws);
    expect(out.coordinatorNote).toEqual({ reviewed: true });
    expect(out.futureField).toEqual([1, 2]);
  });

  it('keeps an operation it does not recognise untouched when another part of the form is saved', () => {
    const future = { operationCode: 'FUTURE_FEE', selected: true, localDisplayName: 'Kinabukasan', extra: { n: 1 } };
    const doc = { ...JSON.parse(versionless), operations: { version: 1, items: [future, { operationCode: 'WCF', selected: true }] } };
    const ws = workspace(JSON.stringify(doc));

    expect(ws.preservedOperationNames()).toEqual(['FUTURE_FEE']);
    ws.setAdmin('name', 'Someone Else');
    const out = saved(ws);
    expect(out.administrator.name).toBe('Someone Else');
    expect(out.operations.items).toContainEqual(future); // byte-for-byte, not translated into anything else
    expect(codes(out)).toEqual(['WCF', 'FUTURE_FEE']);
  });

  it('preserves a repeated code and an item with no boolean selected flag, rather than guessing', () => {
    const repeat = { operationCode: 'WCF', selected: false };
    const unflagged = { operationCode: 'ECF' };
    const doc = { ...JSON.parse(versionless), operations: { version: 1, items: [{ operationCode: 'WCF', selected: true }, repeat, unflagged] } };
    const ws = workspace(JSON.stringify(doc));

    expect(ws.isOperationSelected('WCF')).toBe(true);
    expect(ws.isOperationSelected('ECF')).toBe(false);
    const out = saved(ws);
    expect(out.operations.items).toContainEqual(repeat);
    expect(out.operations.items).toContainEqual(unflagged);
  });

  it('removes preserved entries only when the office explicitly discards them', () => {
    const doc = { ...JSON.parse(versionless), operations: { version: 1, items: [{ operationCode: 'FUTURE_FEE', selected: true }] } };
    const ws = workspace(JSON.stringify(doc));

    ws.discardPreservedOperations();
    expect(codes(saved(ws))).toEqual([]);
  });

  it('matches the shared catalog contract of codes and standard labels', () => {
    const contract = [
      'FISH_MEAT_VENDOR_FEE|Fish / Meat Vendor Fee', 'WEIGHT_AND_MEASURE|Weight & Measure', 'MARKET_FEES|Market Fees',
      'KANMANGGAY_SPACE_RENTAL|Municipal Space Rental', 'FIESTA_ARAW_LOT_RENTAL|Event / Temporary Lot Rental',
      'VEGETABLE_FRUIT_SPACE_RENTAL|Vegetable / Fruit Space Rental', 'ECF|Electricity Consumption Fees',
      'WCF|Water Consumption Fees', 'LANDING_BERTHING|Landing / Berthing', 'TRANSPORTATION|Transportation / Parking',
      'TRANSFER_LARGE_CATTLE|Transfer Large Cattle',
    ];
    const ws = workspace();
    expect(ws.operationCatalog.map((o) => `${o.code}|${o.label}`)).toEqual(contract);
  });

  it('does not describe ECF/WCF as reading-only: they follow verified service and direct or office-prepared collection', () => {
    const ws = workspace();
    for (const code of ['ECF', 'WCF']) {
      const hint = ws.operationCatalog.find((o) => o.code === code)!.hint;
      expect(hint).toMatch(/verified/);
      expect(hint).toMatch(/directly or from an office-prepared bill/);
      expect(hint).not.toMatch(/meter reading/i);
    }
  });

  it('refuses a local name that reads as another operation, or repeats one, and blocks submission', () => {
    const ws = workspace(versionless);
    ws.toggleOperation('KANMANGGAY_SPACE_RENTAL');
    ws.toggleOperation('FIESTA_ARAW_LOT_RENTAL');

    ws.setOperationName('KANMANGGAY_SPACE_RENTAL', 'Water Consumption Fees');
    expect(ws.operationProblem('KANMANGGAY_SPACE_RENTAL')).toMatch(/standard name of another operation/);
    expect(ws.operationsValid()).toBe(false);

    ws.setOperationName('KANMANGGAY_SPACE_RENTAL', 'Plaza Space');
    ws.setOperationName('FIESTA_ARAW_LOT_RENTAL', 'plaza space');
    expect(ws.operationProblem('FIESTA_ARAW_LOT_RENTAL')).toMatch(/already uses that name/);

    let submitted = false;
    ws.submitDraft.subscribe(() => (submitted = true));
    ws.submit();
    expect(submitted).toBe(false);

    ws.setOperationName('FIESTA_ARAW_LOT_RENTAL', 'Pista Lot');
    expect(ws.operationsValid()).toBe(true);
  });

  it('caps a local name at the length the server accepts', () => {
    const ws = workspace();
    ws.toggleOperation('WCF');
    ws.setOperationName('WCF', 'x'.repeat(200));
    expect(ws.operationName('WCF').length).toBe(80);
  });

  it('gives an office its own facility a custom slot and stops at five', () => {
    const ws = workspace();
    const other = ws.catalog.find((c) => c.key === 'other')!;
    for (let i = 1; i <= 5; i++) {
      ws.addFromCatalog(other);
      ws.setFacility(ws.facilities()[i - 1].id, 'name', `Space ${i}`);
    }
    expect(ws.facilities()).toHaveLength(5);
    expect(ws.isCatalogUsed(other)).toBe(true);

    ws.addFromCatalog(other);
    expect(ws.facilities()).toHaveLength(5);
  });

  it('records the facility catalog key, which activation maps the facility identity from', () => {
    const ws = workspace();
    ws.addFromCatalog(ws.catalog.find((c) => c.key === 'commercial')!);
    expect(saved(ws).facilities[0].catalogKey).toBe('commercial');
  });
});
