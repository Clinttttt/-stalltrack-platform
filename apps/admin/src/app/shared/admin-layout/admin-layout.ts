import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../icon/icon';
import { AuthService } from '../../core/auth.service';
import { PasswordRecoveryService } from '../../core/password-recovery.service';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { to: '/onboarding', label: 'LGU Onboarding', icon: 'layers' },
  { to: '/validation', label: 'Validation', icon: 'activity' },
  { to: '/activation', label: 'Activation', icon: 'power' },
];

/**
 * Faithful Angular port of the React apps/admin/src/components/AdminLayout.jsx.
 * Sidebar + top bar shell wrapping the routed console pages.
 *
 * It used to provide a DemoStore here so the three pages could share one seeded working set, mirroring the React
 * provider. That store held fabricated assessment requests for municipalities that never applied, and by the time
 * every page had been wired to the live endpoints no page injected it any more - it was seeded on each render and
 * read by nobody. Removed 2026-08-17 along with the seed data itself.
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  private readonly auth = inject(AuthService);
  private readonly recovery = inject(PasswordRecoveryService);
  private readonly router = inject(Router);

  readonly nav = NAV;
  readonly user = this.auth.currentUser();

  /**
   * Whether this account's address still needs confirming, and what happened when it was asked for.
   *
   * Stated rather than left to be discovered: a password reset is only ever emailed to a confirmed address, and this
   * account has nobody above it to restore access. An account created before confirmation existed carries an unconfirmed
   * address and would find that out only on the day it forgot its password.
   */
  readonly unconfirmedEmail = signal<string | null>(null);
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly sendError = signal('');

  constructor() {
    void this.recovery.myEmailConfirmation().then((state) => {
      if (state && !state.verified && state.email) this.unconfirmedEmail.set(state.email);
    });
  }

  confirmEmail(): void {
    if (this.sending()) return;

    this.sendError.set('');
    this.sending.set(true);

    void this.recovery.sendMyEmailConfirmation().then((res) => {
      this.sending.set(false);
      if (res.ok) this.sent.set(true);
      else this.sendError.set(res.error || 'The confirmation email could not be sent.');
    });
  }

  async signOut(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
