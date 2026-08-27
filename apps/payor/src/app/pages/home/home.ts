import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BrandingService } from '../../core/branding.service';
import { peso } from '../../core/format';
import { PayorBalance, PortalApi } from '../../core/portal.api';
import { PayorLayout } from '../../shared/payor-layout';

/**
 * The payor's own accounts.
 *
 * Each space states the rule it is billed under, because a market stall owes a day's fee for each day it trades while
 * the other facilities owe a month's rent. Showing a monthly figure against a balance built from days is what made the
 * old portal unreadable for a market payor, and it is not repeated here.
 */
@Component({
  selector: 'app-home',
  imports: [PayorLayout, RouterLink],
  templateUrl: './home.html',
})
export class Home {
  private readonly api = inject(PortalApi);
  private readonly auth = inject(AuthService);
  private readonly branding = inject(BrandingService);
  private readonly router = inject(Router);

  protected readonly accounts = signal<PayorBalance[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly name = computed(() => this.auth.name());
  protected readonly total = computed(() => this.accounts().reduce((sum, a) => sum + a.outstandingBalance, 0));
  protected readonly withBalance = computed(() => this.accounts().filter((a) => a.outstandingBalance > 0).length);

  protected money = peso;

  constructor() {
    void this.load();
  }

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    this.branding.forget();
    await this.router.navigate(['/login']);
  }

  private async load(): Promise<void> {
    try {
      const balances = await this.api.balances();
      this.accounts.set(balances);
      // The payor's name comes from their own account rather than from a token, which this app never reads.
      this.auth.nameIs(balances[0]?.occupant ?? null);
    } catch {
      this.error.set('Your accounts could not be read just now. Try again in a moment.');
    } finally {
      this.loading.set(false);
    }
  }
}
