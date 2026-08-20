import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformSetupService } from './platform-setup.service';
import { API_BASE_URL } from './api.config';

// ─────────────────────────────────────────────────────────────────────────────
// What the first-run form tells the operator when the API refuses.
//
// Reported from use: the office entered the e-mail address its own Head already held. The database rejected
// the duplicate, the middleware turned that unique violation into a 409, and this service answered every 409
// with one fixed sentence — "a platform operator already exists" — so the office was told setup was finished
// while /status kept correctly reporting that no operator existed. It also read only detail/message/title,
// while this API answers { isSuccess, error }, so every reason the server DID state was discarded.
// ─────────────────────────────────────────────────────────────────────────────

describe('PlatformSetupService: what a refusal says', () => {
  let service: PlatformSetupService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlatformSetupService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlatformSetupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const submit = () =>
    service.createFirstOperator({ fullName: 'A B', username: 'console.admin', email: 'a@b.ph', password: 'Passw0rd1' });

  function flush(status: number, body: string | object | null): void {
    http.expectOne(`${API_BASE_URL}/api/platform-setup/create-first-operator`).flush(body, {
      status,
      statusText: String(status),
    });
  }

  it("shows the server's reason for a duplicate address, and does not call it an existing operator", async () => {
    const pending = submit();
    flush(400, { isSuccess: false, error: 'That e-mail address already belongs to an account on this platform.' });
    const res = await pending;

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('e-mail address already belongs');
    expect(res.error).not.toContain('already exists');
    expect(res.alreadySetUp).toBeFalsy();
  });

  it("shows the server's reason for a username in use", async () => {
    const pending = submit();
    flush(400, { isSuccess: false, error: "The username 'console.admin' is already in use." });
    const res = await pending;

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('already in use');
  });

  it('treats a 409 as an operator that really exists, and offers sign-in', async () => {
    const pending = submit();
    flush(409, { isSuccess: false, error: 'A platform operator already exists for this console. Sign in with that account.' });
    const res = await pending;

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('already exists');
    expect(res.alreadySetUp).toBe(true);
  });

  it('still says something useful when a 409 carries no wording', async () => {
    const pending = submit();
    flush(409, null);
    const res = await pending;

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('already exists');
    expect(res.alreadySetUp).toBe(true);
  });

  it('joins validation errors when the API returns a field dictionary', async () => {
    const pending = submit();
    flush(400, { isSuccess: false, errors: { Password: ['Password must contain a number.'] } });
    const res = await pending;

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain('must contain a number');
  });

  it('reports success plainly', async () => {
    const pending = submit();
    http.expectOne(`${API_BASE_URL}/api/platform-setup/create-first-operator`).flush(true);
    const res = await pending;

    expect(res.ok).toBe(true);
  });
});
