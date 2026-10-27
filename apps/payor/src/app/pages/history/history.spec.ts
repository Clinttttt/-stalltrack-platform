import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api.config';
import { History } from './history';

describe('Payor payment history detail', () => {
  let http: HttpTestingController;

  async function render(): Promise<ComponentFixture<History>> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(History);
    fixture.detectChanges();
    http.expectOne(`${API_BASE_URL}/api/payor/balances`).flush([
      { stallId: '11111111-1111-1111-1111-111111111111', stallNo: '24', facility: 'NCC',
        facilityName: 'New Commercial Center', outstandingBalance: 0 },
    ]);
    // The history call starts only after the balances Promise has resolved.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    http.expectOne(`${API_BASE_URL}/api/payor/stalls/11111111-1111-1111-1111-111111111111/history`).flush([
      { period: '2026-10', status: 'Paid', totalBill: 1, amountPaid: 1, balanceDue: 0,
        orNumber: 'OR-2026-01', paidAt: '2026-10-27T02:26:00Z', recordedByName: 'Online',
        isExcused: false, days: null },
    ]);
    http.match(`${API_BASE_URL}/api/municipalities/current/branding`)
      .forEach((req) => req.flush({ name: 'Cantilan', sealPath: null }));
    // Resolve the final Promise.all and let the component commit its signal before asserting the DOM.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  afterEach(() => http?.verify());

  it('opens a read-only payment statement with the true recorded OR and amounts, then closes', async () => {
    const fixture = await render();
    const row = fixture.nativeElement.querySelector('button[aria-label^="View details"]') as HTMLButtonElement;
    expect(row).not.toBeNull();
    row.click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('New Commercial Center');
    expect(dialog.textContent).toContain('OR-2026-01');
    expect(dialog.textContent).toContain('Online');
    expect(dialog.textContent).toContain('₱1.00');
    expect(dialog.textContent).toContain('not an Official Receipt');
    expect(dialog.textContent).not.toContain('SRC-2026-');

    (dialog.querySelector('button[aria-label="Close payment details"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the exact canonical SRCs separately from the physical OR, including partial payments', async () => {
    const fixture = await render();
    const instance = fixture.componentInstance as unknown as {
      selected: { set: (v: unknown) => void };
      ledgers: () => Array<{ account: unknown; months: Array<Record<string, unknown>> }>;
    };
    const { account, months } = instance.ledgers()[0];
    instance.selected.set({ account, month: {
      ...months[0], srcReferences: ['SRC-2026-000101', 'SRC-2026-000102'],
    } });
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('SRC-2026-000101');
    expect(dialog.textContent).toContain('SRC-2026-000102');
    expect(dialog.textContent).toContain('OR-2026-01');
    expect(dialog.textContent).toContain('System collection reference, not a physical receipt.');
  });

  it('presents a payment without an OR as pending, without inventing an SRC or receipt', async () => {
    const fixture = await render();
    const instance = fixture.componentInstance as unknown as {
      selected: { set: (v: unknown) => void };
      ledgers: () => Array<{ account: unknown; months: Array<Record<string, unknown>> }>;
    };
    const { account, months } = instance.ledgers()[0];
    instance.selected.set({ account, month: { ...months[0], orNumber: null } });
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Awaiting office-issued OR');
    expect(dialog.textContent).not.toContain('SRC-2026-');
  });
});
