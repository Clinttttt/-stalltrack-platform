import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PasswordRecoveryService } from './password-recovery.service';
import { API_BASE_URL } from './api.config';

// ─────────────────────────────────────────────────────────────────────────────
// Recovering the platform operator's own account.
//
// The operator is the one account with nobody above it to restore its access: every municipal Head can be reset by the
// platform, and the platform's own operator could previously only be reset in the database by hand.
//
// The security posture is the API's, and this service must not undo it. A request never reports whether an address is
// known — the API answers the same way for an address it has never seen as for one it has just emailed — so this passes
// that through rather than trying to be helpful. Telling a stranger which addresses hold a platform-operator account
// tells them where to aim.
// ─────────────────────────────────────────────────────────────────────────────

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PasswordRecoveryService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PasswordRecoveryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('asking for a link', () => {
    it('sends the trimmed address to the anonymous endpoint', async () => {
      const pending = service.request('  operator@stalltrack.site  ');

      const req = http.expectOne(`${API_BASE_URL}/api/adminauth/forgot-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'operator@stalltrack.site' });
      req.flush(true);

      expect((await pending).ok).toBe(true);
    });

    it('reports success for an address the server does not know, because the server does', async () => {
      // The API is deliberately enumeration-safe. Reporting anything else here would give away what it withholds.
      const pending = service.request('stranger@example.com');
      http.expectOne(`${API_BASE_URL}/api/adminauth/forgot-password`).flush(true);

      const res = await pending;
      expect(res.ok).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('asks nothing of the server for an empty address', async () => {
      const res = await service.request('   ');

      expect(res.ok).toBe(false);
      expect(res.error).toContain('email address');
      // http.verify() in afterEach is the assertion: no request was made.
    });

    it('says to wait when the rate limiter refuses', async () => {
      const pending = service.request('operator@stalltrack.site');
      http.expectOne(`${API_BASE_URL}/api/adminauth/forgot-password`).flush(null, { status: 429, statusText: '429' });

      const res = await pending;
      expect(res.ok).toBe(false);
      expect(res.error).toContain('Too many attempts');
    });
  });

  describe('reading whose link it is', () => {
    it('names the account the token belongs to', async () => {
      const pending = service.context('tok-9');

      const req = http.expectOne(`${API_BASE_URL}/api/adminauth/reset-context/tok-9`);
      expect(req.request.method).toBe('GET');
      req.flush({ username: 'console.admin', fullName: 'Platform Operator' });

      expect(await pending).toEqual({ username: 'console.admin', fullName: 'Platform Operator' });
    });

    it('answers with nothing for a token that is unknown, used or expired', async () => {
      const pending = service.context('stale');
      http.expectOne(`${API_BASE_URL}/api/adminauth/reset-context/stale`).flush(null, { status: 404, statusText: '404' });

      expect(await pending).toBeNull();
    });

    it('escapes the token in the address', async () => {
      // The token is url-safe base64, but it reaches this service from the address bar and is not this app's to trust.
      const pending = service.context('a/b c');
      http.expectOne(`${API_BASE_URL}/api/adminauth/reset-context/a%2Fb%20c`).flush({ username: 'x', fullName: null });

      await pending;
    });
  });

  describe('setting the new password', () => {
    it('sends the token and the password', async () => {
      const pending = service.reset('tok-9', 'Passw0rd1');

      const req = http.expectOne(`${API_BASE_URL}/api/adminauth/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'tok-9', newPassword: 'Passw0rd1' });
      req.flush(true);

      expect((await pending).ok).toBe(true);
    });

    it("shows the server's own reason, so the operator is not left guessing at their password", async () => {
      const pending = service.reset('tok-9', 'password');
      http
        .expectOne(`${API_BASE_URL}/api/adminauth/reset-password`)
        .flush({ isSuccess: false, error: 'Password must contain a digit.' }, { status: 400, statusText: '400' });

      const res = await pending;
      expect(res.ok).toBe(false);
      expect(res.error).toBe('Password must contain a digit.');
    });

    it('falls back to plain wording when the server states nothing', async () => {
      const pending = service.reset('tok-9', 'Passw0rd1');
      http.expectOne(`${API_BASE_URL}/api/adminauth/reset-password`).flush(null, { status: 500, statusText: '500' });

      const res = await pending;
      expect(res.ok).toBe(false);
      expect(res.error).toContain('could not be set');
    });
  });
});
