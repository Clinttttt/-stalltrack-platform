import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortalApi, PayableItem } from './portal.api';
import { API_BASE_URL } from './api.config';

// ─────────────────────────────────────────────────────────────────────────────
// The payor's API client, where the shape of a request decides what somebody is charged.
//
// The property worth holding here is what is NOT sent. No amount goes to the initiate endpoint: the API prices the item
// again at initiation, so a figure altered in the browser cannot become the figure charged. No payor id goes anywhere
// either: every one of these endpoints is scoped to whoever holds the cookies, so this client could not read another
// payor's account if it tried.
// ─────────────────────────────────────────────────────────────────────────────

const marketDay: PayableItem = {
  stallId: '11111111-1111-1111-1111-111111111111',
  stallNo: 'A-12',
  facility: 'New Public Market',
  year: 2026,
  month: 8,
  period: '2026-08',
  balanceDue: 180,
  kind: 'NpmDaily',
  uncollectedDays: null,
  baseFee: null,
  fishRatePerKilo: null,
  days: 3,
  dailyRate: 60,
};

const fishMonth: PayableItem = {
  ...marketDay,
  balanceDue: 0,
  kind: 'NpmFish',
  uncollectedDays: ['2026-08-26', '2026-08-27', '2026-08-28'],
  baseFee: 60,
  fishRatePerKilo: 1,
  days: null,
  dailyRate: null,
};

describe('PortalApi', () => {
  let api: PortalApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PortalApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PortalApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('starting a payment', () => {
    it('sends what to pay for and never how much', async () => {
      const pending = api.initiate(marketDay);

      const req = http.expectOne(`${API_BASE_URL}/api/onlinepayments/initiate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        stallId: marketDay.stallId,
        year: 2026,
        month: 8,
        kind: 'NpmDaily',
        fishDays: null,
      });
      // The figures on the screen stay on the screen. Anything the browser could edit is priced again by the API.
      expect(Object.keys(req.request.body as object)).not.toContain('amount');
      expect(Object.keys(req.request.body as object)).not.toContain('balanceDue');
      expect(Object.keys(req.request.body as object)).not.toContain('dailyRate');

      req.flush({ checkoutUrl: 'https://pay.example/abc', reference: 'ref-1' });
      expect((await pending).checkoutUrl).toBe('https://pay.example/abc');
    });

    it('carries no payor id, because the cookies say who is asking', async () => {
      const pending = api.initiate(marketDay);
      const req = http.expectOne(`${API_BASE_URL}/api/onlinepayments/initiate`);

      const body = req.request.body as Record<string, unknown>;
      expect(Object.keys(body).some((k) => /payor|account|user/i.test(k))).toBe(false);

      req.flush({ checkoutUrl: 'u', reference: 'r' });
      await pending;
    });

    it('states each fish day with the kilos declared for it', async () => {
      // A fish day costs the stall's daily fee plus that day's own weighing fee, so the kilos belong to the DAY and not
      // to the month. Sending a single total would price three days off one weighing.
      const pending = api.initiate(fishMonth, {
        fishDays: [
          { day: 26, kilos: 12.5 },
          { day: 27, kilos: 0 },
          { day: 28, kilos: 3 },
        ],
      });

      const req = http.expectOne(`${API_BASE_URL}/api/onlinepayments/initiate`);
      expect(req.request.body).toEqual({
        stallId: fishMonth.stallId,
        year: 2026,
        month: 8,
        kind: 'NpmFish',
        fishDays: [
          { day: 26, kilos: 12.5 },
          { day: 27, kilos: 0 },
          { day: 28, kilos: 3 },
        ],
      });

      req.flush({ checkoutUrl: 'u', reference: 'r' });
      await pending;
    });

    it('sends one day in the same shape as several', async () => {
      // One shape, so the day-at-a-time path and the several-days path cannot drift apart. The API reads the single entry.
      const pending = api.initiate(fishMonth, { fishDays: [{ day: 26, kilos: 12.5 }] });

      const req = http.expectOne(`${API_BASE_URL}/api/onlinepayments/initiate`);
      expect((req.request.body as { fishDays: unknown }).fishDays).toEqual([{ day: 26, kilos: 12.5 }]);

      req.flush({ checkoutUrl: 'u', reference: 'r' });
      await pending;
    });

    it("lets a refusal reach the caller, so the office's own words can be shown", async () => {
      const pending = api.initiate(marketDay);
      http
        .expectOne(`${API_BASE_URL}/api/onlinepayments/initiate`)
        .flush({ error: 'That day was collected at the stall.' }, { status: 400, statusText: '400' });

      await expect(pending).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('confirming on return from checkout', () => {
    it('asks by reference only, and reports an unsettled payment as unsettled', async () => {
      // The gateway's webhook settles a payment. This read must never dress "pending" up as "paid".
      const pending = api.confirm('ref-1');

      const req = http.expectOne(`${API_BASE_URL}/api/onlinepayments/confirm`);
      expect(req.request.body).toEqual({ reference: 'ref-1' });
      req.flush({ status: 'AwaitingSettlement', settled: false });

      expect(await pending).toEqual({ status: 'AwaitingSettlement', settled: false });
    });
  });

  describe('reading the account', () => {
    it("answers the payor's own record from a call carrying no id", async () => {
      const pending = api.me();

      const req = http.expectOne(`${API_BASE_URL}/api/payor/me`);
      expect(req.request.method).toBe('GET');
      expect(req.request.urlWithParams).toBe(`${API_BASE_URL}/api/payor/me`);

      req.flush({ fullName: 'Godon Lar', contactNumber: '09384326778' });
      expect(await pending).toEqual({ fullName: 'Godon Lar', contactNumber: '09384326778' });
    });

    it('answers nothing rather than throwing, so a profile screen can say so', async () => {
      const pending = api.me();
      http.expectOne(`${API_BASE_URL}/api/payor/me`).flush(null, { status: 500, statusText: '500' });

      expect(await pending).toBeNull();
    });

    it('reads balances and payable items as lists, and an empty answer as an empty list', async () => {
      const balances = api.balances();
      http.expectOne(`${API_BASE_URL}/api/payor/balances`).flush(null);
      expect(await balances).toEqual([]);

      const items = api.payableItems();
      http.expectOne(`${API_BASE_URL}/api/payor/payable-items`).flush(null);
      expect(await items).toEqual([]);
    });

    it('asks for one space history by its own id', async () => {
      const pending = api.history(marketDay.stallId);

      http
        .expectOne(`${API_BASE_URL}/api/payor/stalls/${marketDay.stallId}/history`)
        .flush([{ period: '2026-07', status: 'Paid' }]);

      expect(await pending).toHaveLength(1);
    });
  });
});
