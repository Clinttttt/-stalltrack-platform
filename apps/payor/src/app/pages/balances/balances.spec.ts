import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Balances } from './balances';
import { PayableItem } from '../../core/portal.api';
import { API_BASE_URL } from '../../core/api.config';

// ─────────────────────────────────────────────────────────────────────────────
// The only place this app does arithmetic with money.
//
// A fish stall is not billed like any other space. Each day costs the stall's daily fee PLUS that day's own weighing fee,
// so a month cannot be priced from a single total: three days off one weighing would charge the wrong figure three times.
// The screen has to show the payor what they are about to pay before they leave for the gateway, and that figure has to
// agree with the one the API prices at initiation, or a payor sees one amount and is charged another.
//
// The day picker is a COUNT, not a set, and that is the rule most easily broken by a later change: the office settles a
// daily-billed month oldest first, so paying a later day while an earlier one stayed open would strand an arrear behind a
// settled day. Tapping a day therefore takes that day and every day before it.
//
// These figures are shown, never trusted. The API prices every day again at initiation and those are the amounts charged.
// ─────────────────────────────────────────────────────────────────────────────

const fishMonth: PayableItem = {
  stallId: '11111111-1111-1111-1111-111111111111',
  stallNo: 'F-3',
  facility: 'New Public Market',
  year: 2026,
  month: 8,
  period: '2026-08',
  balanceDue: 0,
  kind: 'NpmFish',
  uncollectedDays: ['2026-08-26', '2026-08-27', '2026-08-28'],
  baseFee: 60,
  fishRatePerKilo: 1,
  days: null,
  dailyRate: null,
};

/** Reaches the component's own members. They are protected because no template outside this screen may use them. */
type Inner = {
  fishItem: { set: (v: PayableItem | null) => void };
  fishDayCount: () => number;
  fishDays: () => string[];
  fishTotal: () => number;
  fishKilosTotal: () => number;
  openFish: (item: PayableItem) => void;
  closeFish: () => void;
  isPicked: (index: number) => boolean;
  pickThrough: (index: number) => void;
  pickAll: (item: PayableItem) => void;
  kilosFor: (day: string) => number | null;
  setKilosFor: (day: string, event: Event) => void;
  fishBreakdown: (item: PayableItem) => string;
  shown: (item: PayableItem) => number;
  caption: (item: PayableItem) => string;
  label: (item: PayableItem) => string;
  total: () => number;
};

function kilosTyped(value: string): Event {
  return { target: { value } } as unknown as Event;
}

describe('Balances: what a fish day costs', () => {
  let inner: Inner;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(Balances);
    inner = fixture.componentInstance as unknown as Inner;

    // The screen reads both on creation: the rows from the payable items, the total from the office's own balances.
    http.expectOne(`${API_BASE_URL}/api/payor/payable-items`).flush([fishMonth]);
    http.expectOne(`${API_BASE_URL}/api/payor/historical/obligations`).flush([]);
    http.expectOne(`${API_BASE_URL}/api/payor/balances`).flush([
      { outstandingBalance: 180 },
      { outstandingBalance: 60 },
    ]);
    // The shell asks the API which office it is showing, so the seal and name are that municipality's own.
    http
      .match(`${API_BASE_URL}/api/municipalities/current/branding`)
      .forEach((req) => req.flush({ name: 'Municipality of Cantilan', sealPath: null }));

    inner.openFish(fishMonth);
  });

  afterEach(() => http.verify());

  describe('choosing days', () => {
    it('starts on the earliest day owed, which is the one the office collects first', () => {
      expect(inner.fishDayCount()).toBe(1);
      expect(inner.fishDays()).toEqual(['2026-08-26']);
    });

    it('tapping a day takes that day and every day before it', () => {
      inner.pickThrough(2);

      expect(inner.fishDays()).toEqual(['2026-08-26', '2026-08-27', '2026-08-28']);
      expect(inner.isPicked(0)).toBe(true);
      expect(inner.isPicked(1)).toBe(true);
      expect(inner.isPicked(2)).toBe(true);
    });

    it('never leaves a gap, because an arrear behind a settled day is not something the office can undo', () => {
      inner.pickThrough(2);
      // Reaching back to the middle day drops the last one, rather than deselecting the middle and stranding the third.
      inner.pickThrough(1);

      expect(inner.fishDays()).toEqual(['2026-08-26', '2026-08-27']);
      expect(inner.isPicked(2)).toBe(false);
    });

    it('tapping the last day included steps back off it', () => {
      inner.pickThrough(1);
      expect(inner.fishDayCount()).toBe(2);

      inner.pickThrough(1);
      expect(inner.fishDayCount()).toBe(1);
    });

    it('will not step back off the only day left, because paying nothing is not a payment', () => {
      inner.pickThrough(0);
      inner.pickThrough(0);

      expect(inner.fishDayCount()).toBe(1);
      expect(inner.fishDays()).toHaveLength(1);
    });

    it('takes everything owed when the payor says so', () => {
      inner.pickAll(fishMonth);
      expect(inner.fishDays()).toHaveLength(3);
    });
  });

  describe('the amount shown before committing', () => {
    it('is each day own fee where nothing has been declared', () => {
      inner.pickAll(fishMonth);
      expect(inner.fishTotal()).toBe(180);
    });

    it('adds each day kilos at the office rate, day by day', () => {
      // 26th: 60 + 12.5. 27th: 60 + 0. 28th: 60 + 3. A single 15.5 kg total would price the same, which is why the
      // declarations are kept by day and this spec states them separately.
      inner.pickAll(fishMonth);
      inner.setKilosFor('2026-08-26', kilosTyped('12.5'));
      inner.setKilosFor('2026-08-28', kilosTyped('3'));

      expect(inner.fishTotal()).toBe(180 + 15.5);
      expect(inner.fishKilosTotal()).toBe(15.5);
    });

    it('counts only the days chosen, not every day declared for', () => {
      inner.pickAll(fishMonth);
      inner.setKilosFor('2026-08-28', kilosTyped('10'));

      inner.pickThrough(0); // back to the 26th alone
      expect(inner.fishDays()).toEqual(['2026-08-26']);
      // The 10 kg typed against the 28th is remembered, but it is not paid for while that day is not being paid for.
      expect(inner.kilosFor('2026-08-28')).toBe(10);
      expect(inner.fishTotal()).toBe(60);
    });

    it('charges the day fee alone where the office prices no kilos', () => {
      // An office that weighs but does not charge per kilo. A borrowed rate here would bill a figure nobody stated.
      const noRate: PayableItem = { ...fishMonth, fishRatePerKilo: 0 };
      inner.openFish(noRate);
      inner.pickAll(noRate);
      inner.setKilosFor('2026-08-26', kilosTyped('20'));

      expect(inner.fishTotal()).toBe(180);
      expect(inner.fishKilosTotal()).toBe(20);
    });
  });

  describe('what a payor can type into a weight', () => {
    it('keeps a decimal weight, because fish is weighed in fractions of a kilo', () => {
      inner.setKilosFor('2026-08-26', kilosTyped('12.5'));
      expect(inner.kilosFor('2026-08-26')).toBe(12.5);
    });

    it('treats a cleared field as nothing declared rather than as zero typed', () => {
      inner.setKilosFor('2026-08-26', kilosTyped('12.5'));
      inner.setKilosFor('2026-08-26', kilosTyped(''));
      expect(inner.kilosFor('2026-08-26')).toBeNull();
    });

    it('refuses a negative weight, which the office refuses too', () => {
      inner.setKilosFor('2026-08-26', kilosTyped('-5'));
      expect(inner.kilosFor('2026-08-26')).toBeNull();
      expect(inner.fishTotal()).toBe(60);
    });

    it('refuses something that is not a number at all', () => {
      inner.setKilosFor('2026-08-26', kilosTyped('twelve'));
      expect(inner.kilosFor('2026-08-26')).toBeNull();
    });

    it('keeps each day declaration to itself', () => {
      inner.pickAll(fishMonth);
      inner.setKilosFor('2026-08-26', kilosTyped('12.5'));
      inner.setKilosFor('2026-08-27', kilosTyped('4'));

      expect(inner.kilosFor('2026-08-26')).toBe(12.5);
      expect(inner.kilosFor('2026-08-27')).toBe(4);
      expect(inner.kilosFor('2026-08-28')).toBeNull();
    });
  });

  describe('closing the sheet', () => {
    it('forgets the declarations, so a later month cannot inherit them', () => {
      inner.pickAll(fishMonth);
      inner.setKilosFor('2026-08-26', kilosTyped('12.5'));

      inner.closeFish();
      inner.openFish(fishMonth);

      expect(inner.fishDayCount()).toBe(1);
      expect(inner.kilosFor('2026-08-26')).toBeNull();
    });
  });

  describe('the rest of the statement', () => {
    it('takes the outstanding total from the office balances, not from the rows', () => {
      // Two reads that must agree. Summing the rows instead would make Balances and Accounts disagree on a fish stall,
      // whose row carries a day fee rather than a month total.
      expect(inner.total()).toBe(240);
    });

    it('shows a fish row as a day fee, because that is what one tap pays', () => {
      expect(inner.shown(fishMonth)).toBe(60);
      expect(inner.caption(fishMonth)).toContain('3 days owed');
    });

    it('names each kind in the office own words', () => {
      expect(inner.label(fishMonth)).toBe('Fish day fees');
      expect(inner.label({ ...fishMonth, kind: 'NpmDaily' })).toBe('Stall rent');
      expect(inner.caption({ ...fishMonth, kind: 'NpmDaily', days: null, dailyRate: null })).toBe('Balance for the month');
      expect(inner.label({ ...fishMonth, kind: 'NpmUtility' })).toBe('Electricity and water');
      expect(inner.label({ ...fishMonth, kind: 'Monthly' })).toBe('Monthly rent');
    });
  });
});

// Only the month's stall rent is paid online. Anything else stays on the statement as a balance, with no Pay action.
describe('Balances: online payment scope', () => {
  const rent: PayableItem = { ...fishMonth, stallNo: 'A-1', kind: 'Monthly', balanceDue: 840, uncollectedDays: null, baseFee: null, fishRatePerKilo: null };
  const utility: PayableItem = { ...rent, kind: 'NpmUtility', balanceDue: 220, payableOnline: false };
  const fish: PayableItem = { ...fishMonth, payableOnline: false };

  async function render(items: PayableItem[]): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Balances);
    http.expectOne(`${API_BASE_URL}/api/payor/payable-items`).flush(items);
    http.expectOne(`${API_BASE_URL}/api/payor/historical/obligations`).flush([]);
    http.expectOne(`${API_BASE_URL}/api/payor/balances`).flush([{ outstandingBalance: 1 }]);
    http
      .match(`${API_BASE_URL}/api/municipalities/current/branding`)
      .forEach((req) => req.flush({ name: 'Test Municipality', sealPath: null }));
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows Pay only for the rent row; utility and fish rows are listed read-only with a note', async () => {
    const el = await render([rent, utility, fish]);

    expect(el.querySelectorAll('article').length).toBe(3);
    expect(el.querySelectorAll('article button').length).toBe(1);
    expect(el.querySelectorAll('[data-testid="pay-offline-note"]').length).toBe(2);
    expect(el.textContent).toContain('Pay at the office or to your collector');
  });

  it('treats an item from an older API (no flag) as payable', async () => {
    const el = await render([rent]);

    expect(el.querySelectorAll('article button').length).toBe(1);
  });

  it('lists each earlier period of monthly rent as its own row; Pay names the period and targets only that one', async () => {
    const june: PayableItem = { ...rent, month: 6, period: '2026-06', balanceDue: 2400 };
    const july: PayableItem = { ...rent, month: 7, period: '2026-07', balanceDue: 2400 };
    const el = await render([june, july]);

    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('article button'));
    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute('aria-label')).toContain('June');
    expect(buttons[1].getAttribute('aria-label')).toContain('July');

    const http = TestBed.inject(HttpTestingController);
    buttons[1].click();
    const req = http.expectOne(`${API_BASE_URL}/api/onlinepayments/initiate`);
    expect(req.request.body).toMatchObject({ month: 7, kind: 'Monthly' }); // one checkout = one stall + period
    req.flush({ checkoutUrl: '', reference: 'x' });
  });
});
