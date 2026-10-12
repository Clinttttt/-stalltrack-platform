import { describe, expect, it } from 'vitest';
import { OPERATION_CATALOG, parseOperations } from './onboarding-operations';

// The admin console, the landing workspace and the server each keep a copy of the operation catalog. These are the literals
// all three pin (the server in OnboardingOperationDeclarationTests, the landing app in onboarding-operations.spec.ts). Changing
// one copy without the others fails a test in whichever repo is touched.
const CONTRACT = [
  'FISH_MEAT_VENDOR_FEE|Fish / Meat Vendor Fee',
  'WEIGHT_AND_MEASURE|Weight & Measure',
  'MARKET_FEES|Market Fees',
  'KANMANGGAY_SPACE_RENTAL|Municipal Space Rental',
  'FIESTA_ARAW_LOT_RENTAL|Event / Temporary Lot Rental',
  'VEGETABLE_FRUIT_SPACE_RENTAL|Vegetable / Fruit Space Rental',
  'ECF|Electricity Consumption Fees',
  'WCF|Water Consumption Fees',
  'LANDING_BERTHING|Landing / Berthing',
  'TRANSPORTATION|Transportation / Parking',
  'TRANSFER_LARGE_CATTLE|Transfer Large Cattle',
];

describe('admin operation catalog', () => {
  it('matches the shared contract of codes and standard labels', () => {
    expect(OPERATION_CATALOG.map((o) => `${o.code}|${o.label}`)).toEqual(CONTRACT);
  });
});

describe('parseOperations — the same rules as the server', () => {
  const read = (items: unknown[]) => parseOperations({ version: 1, items });

  it('treats an absent block as nothing declared', () => {
    expect(parseOperations(undefined)).toEqual({ items: [], problems: [] });
    expect(parseOperations({ version: 1 })).toEqual({ items: [], problems: [] });
  });

  it('refuses an item whose selected flag is missing or not a boolean', () => {
    const r = read([{ operationCode: 'WCF' }, { operationCode: 'ECF', selected: 'yes' }]);
    expect(r.items).toEqual([]);
    expect(r.problems).toHaveLength(2);
  });

  it('refuses a repeated operation and an unknown code', () => {
    const r = read([
      { operationCode: 'WCF', selected: true },
      { operationCode: 'WCF', selected: false },
      { operationCode: 'NOPE', selected: true },
    ]);
    expect(r.items.map((i) => i.operationCode)).toEqual(['WCF']);
    expect(r.problems.join(' ')).toMatch(/more than once/);
    expect(r.problems.join(' ')).toMatch(/not a revenue operation/);
  });

  it("refuses a selected name that is another operation's standard name, case-insensitively", () => {
    const r = read([{ operationCode: 'ECF', selected: true, localDisplayName: 'water consumption fees' }]);
    expect(r.items).toEqual([]);
    expect(r.problems[0]).toMatch(/standard name of another operation/);
  });

  it('allows an operation its own standard name, and an unselected operation any name', () => {
    const r = read([
      { operationCode: 'WCF', selected: true, localDisplayName: 'Water Consumption Fees' },
      { operationCode: 'ECF', selected: false, localDisplayName: 'Water Consumption Fees' },
    ]);
    expect(r.problems).toEqual([]);
    expect(r.items).toHaveLength(2);
  });

  it('refuses two selected operations sharing a local name', () => {
    const r = read([
      { operationCode: 'KANMANGGAY_SPACE_RENTAL', selected: true, localDisplayName: 'Plaza Space' },
      { operationCode: 'FIESTA_ARAW_LOT_RENTAL', selected: true, localDisplayName: ' plaza space ' },
    ]);
    expect(r.items.map((i) => i.operationCode)).toEqual(['KANMANGGAY_SPACE_RENTAL']);
    expect(r.problems[0]).toMatch(/already used by/);
  });

  it('refuses control characters and oversized names', () => {
    const r = read([
      { operationCode: 'WCF', selected: true, localDisplayName: 'a\u0007b' },
      { operationCode: 'ECF', selected: true, localDisplayName: 'x'.repeat(81) },
    ]);
    expect(r.items).toEqual([]);
    expect(r.problems.join(' ')).toMatch(/control characters/);
    expect(r.problems.join(' ')).toMatch(/longer than 80/);
  });
});
