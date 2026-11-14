import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PayorLayout } from './payor-layout';
import { API_BASE_URL } from '../core/api.config';

// The bell is how a payor learns a payment is under review, from whichever screen they are on.
describe('PayorLayout: the bell', () => {
  async function render(answer: (http: HttpTestingController) => void) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PayorLayout);
    fixture.detectChanges();
    answer(http);
    http.match(`${API_BASE_URL}/api/municipalities/current/branding`).forEach((req) => req.flush({ name: 'Cantilan', sealPath: null }));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    http.verify();
    return (fixture.nativeElement as HTMLElement).querySelector('a[aria-label^="Notifications"]');
  }

  it('asks for the count on any screen and states it in words', async () => {
    const bell = await render((http) => http.expectOne(`${API_BASE_URL}/api/payor/inbox`).flush({ items: [], unread: 2 }));

    expect(bell?.getAttribute('aria-label')).toBe('Notifications, 2 unread');
    expect(bell?.textContent).toContain('2');
  });

  it('keeps the shell working when the count cannot be read', async () => {
    const bell = await render((http) => http.expectOne(`${API_BASE_URL}/api/payor/inbox`).flush('down', { status: 500, statusText: 'Down' }));

    expect(bell?.getAttribute('aria-label')).toBe('Notifications');
  });
});
