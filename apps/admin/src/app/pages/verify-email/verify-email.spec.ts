import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { VerifyEmail } from './verify-email';
import { PasswordRecoveryService } from '../../core/password-recovery.service';

describe('Platform Admin email confirmation', () => {
  const verify = vi.fn();

  beforeEach(async () => {
    verify.mockReset();
    await TestBed.configureTestingModule({
      imports: [VerifyEmail],
      providers: [
        provideRouter([]),
        { provide: PasswordRecoveryService, useValue: { verifyEmail: verify } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ token: 'one-time-mail-token' }) } },
        },
      ],
    }).compileComponents();
  });

  it('renders inside the existing sign-in design without consuming a link on page load', () => {
    const fixture = TestBed.createComponent(VerifyEmail);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-auth-shell')).not.toBeNull();
    expect(root.textContent).toContain('Confirm your email.');
    expect(root.querySelector('button')?.textContent).toContain('Confirm email address');
    expect(verify).not.toHaveBeenCalled();
  });

  it('submits the emailed token only when the visitor explicitly confirms it', async () => {
    verify.mockResolvedValue({ ok: true });
    const fixture = TestBed.createComponent(VerifyEmail);
    fixture.detectChanges();
    await fixture.componentInstance.confirm();
    fixture.detectChanges();
    expect(verify).toHaveBeenCalledOnce();
    expect(verify).toHaveBeenCalledWith('one-time-mail-token');
    expect(fixture.nativeElement.textContent).toContain('Email confirmed.');
    await fixture.componentInstance.confirm();
    expect(verify).toHaveBeenCalledOnce();
  });

  it('shows an expired-link message without falsely claiming verification', async () => {
    verify.mockResolvedValue({ ok: false, error: 'This confirmation link is invalid, expired, or has already been used.' });
    const fixture = TestBed.createComponent(VerifyEmail);
    await fixture.componentInstance.confirm();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('already been used');
    expect(root.textContent).not.toContain('Email confirmed.');
    expect(root.querySelector('[role=alert]')).not.toBeNull();
  });
});
