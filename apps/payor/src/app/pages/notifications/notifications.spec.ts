import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Notifications } from './notifications';
import { API_BASE_URL } from '../../core/api.config';
import { InboxPage } from '../../core/portal.api';

// A failed read must not look like an empty inbox: a payor told nothing is wrong may pay a month the office is already reviewing.
describe('Notifications', () => {
  const inboxUrl = `${API_BASE_URL}/api/payor/inbox`;
  const unread: InboxPage = {
    unread: 1,
    items: [{ id: 'abc', title: 'Payment under review', body: 'Please do not pay this month again.', link: '/balances', createdAt: '2026-11-05T01:00:00Z', read: false }],
  };

  let http: HttpTestingController;

  async function open(answer: (url: string) => void) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Notifications);
    fixture.detectChanges();
    answer(inboxUrl);
    await settle(fixture);
    return fixture;
  }

  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    http.match(`${API_BASE_URL}/api/municipalities/current/branding`).forEach((req) => req.flush({ name: 'Cantilan', sealPath: null }));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const flushAll = (page: InboxPage) => (url: string) => http.match(url).forEach((req) => req.flush(page));
  const text = (fixture: { nativeElement: unknown }) => (fixture.nativeElement as HTMLElement).textContent ?? '';

  afterEach(() => http.verify());

  it('shows the message in words, with New and the count on the bell', async () => {
    const fixture = await open(flushAll(unread));

    expect(text(fixture)).toContain('Please do not pay this month again.');
    expect(text(fixture)).toContain('New');
    const bell = (fixture.nativeElement as HTMLElement).querySelector('a[aria-label^="Notifications"]');
    expect(bell?.getAttribute('aria-label')).toBe('Notifications, 1 unread');
  });

  it('says a failed read failed, and never that there is nothing here', async () => {
    const fixture = await open((url) => http.match(url).forEach((req) => req.flush('down', { status: 500, statusText: 'Down' })));

    expect(text(fixture)).toContain('could not be read');
    expect(text(fixture)).not.toContain('Nothing here yet');
    expect(text(fixture)).toContain('Try again');
  });

  it('says an empty inbox is empty', async () => {
    const fixture = await open(flushAll({ unread: 0, items: [] }));

    expect(text(fixture)).toContain('Nothing here yet');
    expect(text(fixture)).not.toContain('Mark all as read');
  });

  it('marks one message read at its own address, and the bell follows the server', async () => {
    const fixture = await open(flushAll(unread));

    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Mark as read');
    button?.click();
    http.expectOne(`${inboxUrl}/abc/read`).flush({ unread: 0, items: [{ ...unread.items[0], read: true }] });
    await settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('a[aria-label^="Notifications"]')?.getAttribute('aria-label')).toBe('Notifications');
    expect(text(fixture)).not.toContain('Mark as read');
  });

  it('marks all read without naming any message', async () => {
    const fixture = await open(flushAll(unread));

    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Mark all as read');
    button?.click();
    const req = http.expectOne(`${inboxUrl}/read`);
    expect(req.request.method).toBe('POST');
    req.flush({ unread: 0, items: [{ ...unread.items[0], read: true }] });
    await settle(fixture);

    expect(text(fixture)).not.toContain('Mark all as read');
  });
});
