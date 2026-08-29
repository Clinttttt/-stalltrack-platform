import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { API_BASE_URL } from './api.config';

// ─────────────────────────────────────────────────────────────────────────────
// The interceptor, which is where a payor's session is quietly kept alive.
//
// The access cookie lasts fifteen minutes. A payor reading their balances, choosing days and paying will cross that boundary
// mid-task, and being thrown back to a sign-in screen at that moment is the difference between a paid month and an abandoned
// one. So a 401 buys one refresh and a retry of the original request.
//
// Three ways this can go wrong, and each has a spec here:
//   • refreshing in response to the auth endpoints themselves, which turns a wrong password into a refresh loop;
//   • three refreshes for a screen that loads three things, which spends two rotations of a single-use refresh token and
//     ends the very session it was trying to save;
//   • a failed refresh that leaves the app looking signed in, so every later call fails silently.
//
// Note for anyone adding to this file: the shared refresh is module state by design. Always flush or error the refresh
// request you cause, or it stays in flight and the next spec inherits it.
// ─────────────────────────────────────────────────────────────────────────────

describe('authInterceptor: one refresh, and only where it belongs', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => backend.verify());

  it('sends every call to our API with the cookies attached', () => {
    http.get(`${API_BASE_URL}/api/payor/balances`).subscribe();

    const req = backend.expectOne(`${API_BASE_URL}/api/payor/balances`);
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('leaves another host alone entirely', () => {
    // Branding images, a map tile, anything. Sending session cookies to a third party would be a leak, not a convenience.
    http.get('https://example.org/seal.png').subscribe();

    const req = backend.expectOne('https://example.org/seal.png');
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });

  it('on a 401, refreshes once and retries the original request', async () => {
    const answered = new Promise((resolve) => http.get(`${API_BASE_URL}/api/payor/balances`).subscribe(resolve));

    backend.expectOne(`${API_BASE_URL}/api/payor/balances`).flush(null, { status: 401, statusText: '401' });

    const refresh = backend.expectOne(`${API_BASE_URL}/api/payorauth/refresh-token`);
    expect(refresh.request.method).toBe('POST');
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush({ accessToken: 'a' });

    // The same request again, not a redirect to sign-in.
    backend.expectOne(`${API_BASE_URL}/api/payor/balances`).flush([{ period: '2026-08' }]);

    expect(await answered).toEqual([{ period: '2026-08' }]);
    expect(auth.signedIn()).toBe(false); // untouched: a refresh is not a sign-in
  });

  it('three calls that all meet a 401 share ONE refresh', async () => {
    // A single-use refresh token rotates on every use. Three refreshes means two of them present a token that has already
    // been spent, and the API is right to revoke the session. This is the spec that stops a screen logging its payor out.
    const first = new Promise((resolve) => http.get(`${API_BASE_URL}/api/payor/balances`).subscribe(resolve));
    const second = new Promise((resolve) => http.get(`${API_BASE_URL}/api/payor/payable-items`).subscribe(resolve));
    const third = new Promise((resolve) => http.get(`${API_BASE_URL}/api/payor/me`).subscribe(resolve));

    backend.expectOne(`${API_BASE_URL}/api/payor/balances`).flush(null, { status: 401, statusText: '401' });
    backend.expectOne(`${API_BASE_URL}/api/payor/payable-items`).flush(null, { status: 401, statusText: '401' });
    backend.expectOne(`${API_BASE_URL}/api/payor/me`).flush(null, { status: 401, statusText: '401' });

    backend.expectOne(`${API_BASE_URL}/api/payorauth/refresh-token`).flush({ accessToken: 'a' });

    backend.expectOne(`${API_BASE_URL}/api/payor/balances`).flush('balances');
    backend.expectOne(`${API_BASE_URL}/api/payor/payable-items`).flush('items');
    backend.expectOne(`${API_BASE_URL}/api/payor/me`).flush('me');

    expect(await first).toBe('balances');
    expect(await second).toBe('items');
    expect(await third).toBe('me');
  });

  it('never refreshes in response to the auth endpoints themselves', async () => {
    // A wrong password answers 401. Refreshing on it would loop, and worse, would hide the refusal from the sign-in screen.
    const failed = new Promise<number>((resolve) =>
      http
        .post(`${API_BASE_URL}/api/payorauth/login`, {})
        .subscribe({ error: (e: { status: number }) => resolve(e.status) }),
    );

    backend.expectOne(`${API_BASE_URL}/api/payorauth/login`).flush(null, { status: 401, statusText: '401' });

    expect(await failed).toBe(401);
    backend.expectNone(`${API_BASE_URL}/api/payorauth/refresh-token`);
  });

  it('when the refresh is itself refused, ends the session and asks for a sign-in', async () => {
    const navigated = new Promise<string>((resolve) => {
      vi.spyOn(router, 'navigate').mockImplementation(((commands: readonly unknown[]) => {
        resolve(String(commands[0]));
        return Promise.resolve(true);
      }) as typeof router.navigate);
    });
    auth.nameIs('Godon Lar');

    const failed = new Promise<number>((resolve) =>
      http
        .get(`${API_BASE_URL}/api/payor/balances`)
        .subscribe({ error: (e: { status: number }) => resolve(e.status) }),
    );

    backend.expectOne(`${API_BASE_URL}/api/payor/balances`).flush(null, { status: 401, statusText: '401' });
    backend.expectOne(`${API_BASE_URL}/api/payorauth/refresh-token`).flush(null, { status: 401, statusText: '401' });

    // The original failure is surfaced, not swallowed into a success the screen would render as empty data.
    expect(await failed).toBe(401);
    expect(await navigated).toBe('/login');
    expect(auth.signedIn()).toBe(false);
    expect(auth.name()).toBeNull();
  });

  it('passes any other failure straight through, without touching the session', async () => {
    // A 500 from a report, a 400 from a bad day selection. Signing a payor out over these would be its own bug.
    auth.nameIs('Godon Lar');

    const failed = new Promise<number>((resolve) =>
      http
        .get(`${API_BASE_URL}/api/payor/balances`)
        .subscribe({ error: (e: { status: number }) => resolve(e.status) }),
    );

    backend.expectOne(`${API_BASE_URL}/api/payor/balances`).flush(null, { status: 500, statusText: '500' });

    expect(await failed).toBe(500);
    backend.expectNone(`${API_BASE_URL}/api/payorauth/refresh-token`);
    expect(auth.name()).toBe('Godon Lar');
  });

  it('a later 401 gets its own refresh, once the first has finished', async () => {
    // The sharing is for calls in flight together. An hour later is a new expiry and must be allowed to renew again.
    const first = new Promise((resolve) => http.get(`${API_BASE_URL}/api/payor/balances`).subscribe(resolve));
    backend.expectOne(`${API_BASE_URL}/api/payor/balances`).flush(null, { status: 401, statusText: '401' });
    backend.expectOne(`${API_BASE_URL}/api/payorauth/refresh-token`).flush({ accessToken: 'a' });
    backend.expectOne(`${API_BASE_URL}/api/payor/balances`).flush('first');
    await first;

    const second = new Promise((resolve) => http.get(`${API_BASE_URL}/api/payor/me`).subscribe(resolve));
    backend.expectOne(`${API_BASE_URL}/api/payor/me`).flush(null, { status: 401, statusText: '401' });
    backend.expectOne(`${API_BASE_URL}/api/payorauth/refresh-token`).flush({ accessToken: 'b' });
    backend.expectOne(`${API_BASE_URL}/api/payor/me`).flush('second');

    expect(await second).toBe('second');
  });
});
