import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Balances } from './balances';
import { HistoricalObligation } from '../../core/portal.api';
import { API_BASE_URL } from '../../core/api.config';

// Earlier accounts (ST-19): a lapsed, closed, renewed or former term the office linked to this payor. They are read-only,
// kept apart from the current total, and never offered for online payment.

const row = (over: Partial<HistoricalObligation> = {}): HistoricalObligation => ({
  accountKey: 'contract:a',
  kind: 'StallRent',
  operationName: 'Commercial Center',
  space: 'Stall 11',
  status: 'Re-let',
  context: 'Jan 2025 term, ended Mar 31, 2026',
  period: '2026-02',
  assessed: 1000,
  paid: 0,
  balance: 1000,
  settlement: 'Unpaid',
  channel: 'PayAtOfficeOrCollector',
  payableOnline: false,
  ...over,
});

async function render(earlier: HistoricalObligation[]) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(Balances);
  http.expectOne(`${API_BASE_URL}/api/payor/payable-items`).flush([]);
  http.expectOne(`${API_BASE_URL}/api/payor/historical/obligations`).flush(earlier);
  http.expectOne(`${API_BASE_URL}/api/payor/balances`).flush([{ outstandingBalance: 250 }]);
  http
    .match(`${API_BASE_URL}/api/municipalities/current/branding`)
    .forEach((req) => req.flush({ name: 'Test Municipality', sealPath: null }));
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, http, fixture };
}

describe('Balances: earlier accounts', () => {
  it('lists each earlier account with its term context and its own subtotal, apart from the current total', async () => {
    const { el } = await render([
      row({ period: '2026-02' }),
      row({ period: '2026-03', settlement: 'Partial', paid: 400, balance: 600 }),
      row({ accountKey: 'space:b', kind: 'SpaceRental', operationName: 'Kanmanggay', space: 'A-4', status: 'Renewed', context: 'Earlier term', period: '2025-11', balance: 500 }),
    ]);

    const section = el.querySelector('[data-testid="earlier-accounts"]') as HTMLElement;
    expect(section.querySelectorAll('article').length).toBe(2);
    expect(section.textContent).toContain('Commercial Center · Stall 11');
    expect(section.textContent).toContain('Re-let');
    expect(section.textContent).toContain('Jan 2025 term, ended Mar 31, 2026');
    expect(section.textContent).toContain('Renewed');
    expect(el.querySelector('[data-testid="earlier-total"]')?.textContent).toContain('2,100');
    // the current total is the office's own figure and does not absorb earlier accounts
    expect(el.textContent).toContain('250');
  });

  it('never offers Pay for an earlier account, and says where it is paid', async () => {
    const { el } = await render([row(), row({ period: '2026-03' })]);
    const section = el.querySelector('[data-testid="earlier-accounts"]') as HTMLElement;

    expect(Array.from(section.querySelectorAll('button')).map((b) => b.textContent?.trim())).toEqual(['Link']);
    expect(section.querySelectorAll('[data-testid="earlier-note"]').length).toBe(2);
    expect(section.textContent).toContain('Pay at the office or to your collector');
  });

  it('states plainly that nothing is linked when the payor has no earlier account', async () => {
    const { el } = await render([]);
    expect(el.querySelector('[data-testid="earlier-accounts"]')?.textContent).toContain('None linked to your account.');
  });

  it('links an earlier account with a code, then re-reads the list', async () => {
    const { el, http, fixture } = await render([]);
    const input = el.querySelector('#link-code') as HTMLInputElement;
    input.value = 'abcd-2345';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const link = http.expectOne(`${API_BASE_URL}/api/payor/historical/link`);
    expect(link.request.body).toEqual({ activationCode: 'ABCD-2345' });
    link.flush(1);
    await fixture.whenStable();
    http.expectOne(`${API_BASE_URL}/api/payor/historical/obligations`).flush([row()]);
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="link-message"]')?.textContent).toContain('Linked');
    expect(el.querySelectorAll('[data-testid="earlier-accounts"] article').length).toBe(1);
  });

  it('shows the office refusal when a code cannot be used', async () => {
    const { el, http, fixture } = await render([]);
    const input = el.querySelector('#link-code') as HTMLInputElement;
    input.value = 'WXYZ-2345';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http
      .expectOne(`${API_BASE_URL}/api/payor/historical/link`)
      .flush({ message: 'Invalid or expired activation code.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="link-message"]')?.textContent).toContain('Invalid or expired');
  });
});
