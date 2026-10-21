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
  ])('%s sits in the shared split frame: blue brand panel, white form panel, the audit notice', (_name, component) => {
    const out = html(component);

    expect(out).toContain('Platform Admin');
    expect(out).toContain('Municipal onboarding, managed in one place.');
    expect(out).toContain('Review LGU assessments, validate configurations, and oversee activation.');
    expect(out).toContain('Authorized personnel only. Activity is recorded for audit.');
    expect(out).toContain('md:grid-cols-'); // two panels from tablet width up
    expect(out).toContain('md:hidden'); // and a compact header on phones
    expect(out).not.toContain('CARCANMADCARLAN'); // the cluster blurb is not repeated on every sign-in screen
    expect(out).not.toMatch(/bg-navy|bg-\[#0d2137\]/);
  });

  it('keeps the brand copy short: one heading and one sentence, no lists or statistics', () => {
    const out = html(Login);
    const aside = out.slice(out.indexOf('<aside'), out.indexOf('</aside>'));

    expect(aside.match(/<h2/g)?.length).toBe(1);
    expect(aside.match(/<p[\s>]/g)?.length).toBe(2); // the sentence and the audit notice
    expect(aside).not.toContain('<ul');
    expect(aside).not.toMatch(/\d{2,}%|\d+\+/);
  });

  it('gives the form its own panel: forms never sit inside the brand panel', () => {
    const out = html(Login);
    const aside = out.slice(out.indexOf('<aside'), out.indexOf('</aside>'));

    expect(aside).not.toContain('<form');
    expect(out.indexOf('<form')).toBeGreaterThan(out.indexOf('</aside>'));
  });

  it('Login asks for exactly a username and a password, and links to recovery', () => {
    const out = html(Login);

    expect(out).toContain('id="username"');
    expect(out).toContain('id="password"');
    expect(out).toContain('href="/forgot-password"');
    expect(out).toContain('Sign in');
  });
});
