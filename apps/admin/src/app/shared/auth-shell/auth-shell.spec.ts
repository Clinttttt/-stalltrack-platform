import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Login } from '../../pages/login/login';
import { ForgotPassword } from '../../pages/forgot-password/forgot-password';
import { ConsoleSetup } from '../../pages/setup/setup';

/** Sign in, first-run setup and password recovery share one frame and carry no promotional copy. */
describe('Console authentication screens', () => {
  function html(component: unknown): string {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    const fixture = TestBed.createComponent(component as never);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).innerHTML;
  }

  it.each([
    ['Login', Login],
    ['ForgotPassword', ForgotPassword],
    ['ConsoleSetup', ConsoleSetup],
  ])('%s sits in the shared frame: StallTrack bar, one card, the audit notice', (_name, component) => {
    const out = html(component);

    expect(out).toContain('Platform Admin');
    expect(out).toContain('Authorized personnel only. Activity is recorded for audit.');
    expect(out).toContain('a-card');
    expect(out).not.toContain('CARCANMADCARLAN'); // the cluster blurb is not repeated on every sign-in screen
    expect(out).not.toMatch(/bg-navy|bg-\[#0d2137\]/);
  });

  it('Login asks for exactly a username and a password, and links to recovery', () => {
    const out = html(Login);

    expect(out).toContain('id="username"');
    expect(out).toContain('id="password"');
    expect(out).toContain('href="/forgot-password"');
    expect(out).toContain('Sign in');
  });
});
