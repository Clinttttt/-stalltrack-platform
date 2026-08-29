import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PayorBalance, PortalApi } from '../../core/portal.api';
import { PayorLayout } from '../../shared/payor-layout';

/**
 * The payor's own details, and the spaces the office has linked to them.
 *
 * The name and number are the OFFICE's record, asked of the API rather than read from a token: this app holds no token it
 * can read. That is also why activation stopped asking a payor to type a name — what is shown here is what the register
 * says, so a correction the office makes reaches this screen without the payor signing in again.
 */
@Component({
  selector: 'app-profile',
  imports: [PayorLayout],
  templateUrl: './profile.html',
})
export class Profile {
  private readonly api = inject(PortalApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly fullName = signal<string | null>(null);
  protected readonly contactNumber = signal<string | null>(null);
  protected readonly accounts = signal<PayorBalance[]>([]);
  protected readonly loading = signal(true);
  protected readonly signingOut = signal(false);

  constructor() {
    void this.load();
  }

  /** The space, as the office numbers it. */
  protected where(account: PayorBalance): string {
    return account.stallNo ? `${account.facility} · Stall ${account.stallNo}` : account.facility;
  }

  protected async signOut(): Promise<void> {
    if (this.signingOut()) return;

    this.signingOut.set(true);
    // Revoked at the API, which clears the cookies in the same response, so signing out is never merely local.
    await this.auth.logout();
    await this.router.navigate(['/login'], { replaceUrl: true });
  }

  private async load(): Promise<void> {
    try {
      const [me, accounts] = await Promise.all([this.api.me(), this.api.balances()]);

      if (me) {
        this.fullName.set(me.fullName);
        this.contactNumber.set(me.contactNumber);
        // The header greets the payor by the same name this screen states.
        this.auth.nameIs(me.fullName);
      }

      this.accounts.set(accounts);
    } finally {
      this.loading.set(false);
    }
  }
}
