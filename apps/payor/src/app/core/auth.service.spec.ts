import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { API_BASE_URL } from './api.config';

// ─────────────────────────────────────────────────────────────────────────────
// The payor's session, which this app deliberately cannot see.
//
// The whole design of this portal rests on one property: nothing about the session is readable by script. The API sets
// HttpOnly, Secure, SameSite=Strict cookies; this service holds a boolean and a display name and nothing else. A token in
// localStorage can be read by anything that reaches this origin, and this portal shows a person's own account and can start
// a payment against it.
//
// So these specs hold the shape of that decision rather than only its happy path: every credentialed call carries the
// cookies, no call writes to storage, a refusal never leaves the app believing it is signed in, and signing out is asked of
// the API rather than performed locally.
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService: a session the app cannot read', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);

    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => http.verify());

  describe('signing in', () => {
    it('sends the credentials with the cookies, and believes nothing until the API answers', async () => {
      expect(service.signedIn()).toBe(false);

      const pending = service.login('09384326778', 'Secret123!');

      const req = http.expectOne(`${API_BASE_URL}/api/payorauth/login`);
      expect(req.request.method).toBe('POST');
      // withCredentials is what lets the API set the session cookies on this response. Without it there is no session.
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body).toEqual({ contactNumber: '09384326778', password: 'Secret123!' });

      req.flush({ accessToken: 'a', refreshToken: 'r' });

      expect(await pending).toBeNull();
      expect(service.signedIn()).toBe(true);
    });

    it('writes nothing to storage, even though the API hands back tokens', async () => {
      // The tokens are in the body because the Blazor portal reads them there and was not going to be broken for this.
      // This app ignores them, and that is the point: there is nothing for another script on this origin to steal.
      const pending = service.login('09384326778', 'Secret123!');
      http.expectOne(`${API_BASE_URL}/api/payorauth/login`).flush({ accessToken: 'a', refreshToken: 'r' });
      await pending;

      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    });

    it('a refusal leaves the app signed out and says what the API said', async () => {
      const pending = service.login('09384326778', 'wrong');
      http
        .expectOne(`${API_BASE_URL}/api/payorauth/login`)
        .flush({ error: 'That mobile number and password do not match an account.' }, { status: 401, statusText: '401' });

      expect(await pending).toBe('That mobile number and password do not match an account.');
      expect(service.signedIn()).toBe(false);
    });

    it('says to wait when the rate limiter refuses', async () => {
      const pending = service.login('09384326778', 'Secret123!');
      http.expectOne(`${API_BASE_URL}/api/payorauth/login`).flush(null, { status: 429, statusText: '429' });

      expect(await pending).toContain('Too many attempts');
    });

    it('names a lost connection as one, rather than as bad credentials', async () => {
      const pending = service.login('09384326778', 'Secret123!');
      http.expectOne(`${API_BASE_URL}/api/payorauth/login`).error(new ProgressEvent('offline'), { status: 0 });

      expect(await pending).toContain('No connection');
    });
  });

  describe('activating', () => {
    it('sends the code, the number and the password, and no name', async () => {
      // The register supplies the payor's name. Asking for one proved nothing and invited a mismatch with the office's
      // own record, which is why the field is gone.
      const pending = service.activate('Y3VZ-E2C4', '09384326778', 'Secret123!');

      const req = http.expectOne(`${API_BASE_URL}/api/payorauth/activate`);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body).toEqual({
        activationCode: 'Y3VZ-E2C4',
        contactNumber: '09384326778',
        password: 'Secret123!',
      });

      req.flush({ accessToken: 'a', refreshToken: 'r' });

      expect(await pending).toBeNull();
      expect(service.signedIn()).toBe(true);
    });
  });

  describe('restoring on a reload', () => {
    it('asks the API whether the refresh cookie is still good, because it cannot look', async () => {
      const pending = service.restore();

      const req = http.expectOne(`${API_BASE_URL}/api/payorauth/refresh-token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      // A body is sent because the API accepts the token either way; this app has none to put in it.
      expect(req.request.body).toEqual({});

      req.flush({ accessToken: 'a', refreshToken: 'r' });

      expect(await pending).toBe(true);
      expect(service.signedIn()).toBe(true);
    });

    it('a refusal simply means signing in again', async () => {
      const pending = service.restore();
      http.expectOne(`${API_BASE_URL}/api/payorauth/refresh-token`).flush(null, { status: 401, statusText: '401' });

      expect(await pending).toBe(false);
      expect(service.signedIn()).toBe(false);
    });
  });

  describe('signing out', () => {
    it('revokes at the API, so it is never merely local', async () => {
      const signIn = service.login('09384326778', 'Secret123!');
      http.expectOne(`${API_BASE_URL}/api/payorauth/login`).flush({ accessToken: 'a', refreshToken: 'r' });
      await signIn;
      service.nameIs('Godon Lar');

      const pending = service.logout();
      const req = http.expectOne(`${API_BASE_URL}/api/payorauth/logout`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(true);
      await pending;

      expect(service.signedIn()).toBe(false);
      expect(service.name()).toBeNull();
    });

    it('ends the session locally even when the API cannot be reached', async () => {
      // Already expired or revoked, or simply offline. The cookies are cleared by that response either way, and a payor who
      // asked to sign out must not be left looking signed in.
      const signIn = service.login('09384326778', 'Secret123!');
      http.expectOne(`${API_BASE_URL}/api/payorauth/login`).flush({ accessToken: 'a', refreshToken: 'r' });
      await signIn;

      const pending = service.logout();
      http.expectOne(`${API_BASE_URL}/api/payorauth/logout`).flush(null, { status: 500, statusText: '500' });
      await pending;

      expect(service.signedIn()).toBe(false);
    });
  });

  describe('the display name', () => {
    it('is taken from account data, and a blank one is no name at all', () => {
      service.nameIs('  Godon Lar  ');
      expect(service.name()).toBe('Godon Lar');

      service.nameIs('   ');
      expect(service.name()).toBeNull();

      service.nameIs(null);
      expect(service.name()).toBeNull();
    });
  });

  describe('when a request the interceptor could not save comes back', () => {
    it('the session is treated as ended', () => {
      service.nameIs('Godon Lar');
      service.sessionEnded();

      expect(service.signedIn()).toBe(false);
      expect(service.name()).toBeNull();
    });
  });
});
