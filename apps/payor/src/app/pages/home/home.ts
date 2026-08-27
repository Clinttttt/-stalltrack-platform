import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PayorBalance, PortalApi } from '../../core/portal.api';
import { BottomNav } from '../../shared/bottom-nav';
import { peso } from '../../core/format';

/**
 * The payor's own accounts.
 *
 * Each space states the rule it is billed under, because a market stall owes a day's fee for each day it trades while
 * the other facilities owe a month's rent. Showing a monthly figure against a balance built from days is what made
 * the old portal unreadable for a market payor, and it is not repeated here.
 */
@Component({
  selector: 'app-home',
  imports: [BottomNav],
  template: `
    <div class="p-shell">
      <main class="flex-1 px-5 pb-8">
        <header class="flex items-start justify-between gap-3 pt-6">
          <div>
            <p class="text-[11px] font-bold uppercase leading-none tracking-[0.18em] text-gold">StallTrack</p>
            <h1 class="mt-2 font-display text-xl text-navy">
              {{ name() ? 'Hi, ' + name() : 'Your accounts' }}
            </h1>
          </div>
          <button class="text-xs font-semibold text-muted underline" type="button" (click)="signOut()">Sign out</button>
        </header>

        @if (loading()) {
          <p class="mt-10 text-center text-sm text-muted">Reading your accounts…</p>
        } @else if (error()) {
          <p class="mt-10 rounded-xl bg-red-bg px-4 py-3 text-sm text-red">{{ error() }}</p>
        } @else {
          <section class="mt-5 rounded-2xl border border-line bg-navy p-5 text-white shadow-soft">
            <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Total outstanding</p>
            <p class="mt-1 font-display text-3xl">{{ money(total()) }}</p>
            <p class="mt-1 text-xs text-white/70">
              {{ withBalance() }} of {{ accounts().length }}
              {{ accounts().length === 1 ? 'account' : 'accounts' }} with a balance
            </p>
          </section>

          <p class="mt-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Your accounts</p>

          @for (a of accounts(); track a.stallId) {
            <article class="mt-3 rounded-2xl border border-line bg-white p-4 shadow-soft">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-navy">{{ a.facility }}</p>
                  <p class="mt-0.5 truncate text-xs text-muted">
                    {{ a.stallNo ? 'Stall ' + a.stallNo + ' · ' : '' }}{{ a.occupant }}
                  </p>
                  @if (a.isDailyBilled) {
                    <p class="mt-1 text-xs text-muted">
                      {{ a.daysOwed > 0 ? a.daysOwed + (a.daysOwed === 1 ? ' day owed' : ' days owed') + ' this month' : 'No days owed this month' }}
                    </p>
                  }
                </div>
                <div class="shrink-0 text-right">
                  <p class="font-display text-base text-navy">
                    {{ money(a.isDailyBilled ? a.dailyRate : a.monthlyRate) }}
                  </p>
                  <p class="text-[10px] uppercase tracking-wide text-muted">
                    {{ a.isDailyBilled ? '/ day' : '/ month' }}
                  </p>
                </div>
              </div>

              @if (a.outstandingBalance > 0) {
                <p class="mt-3 border-t border-line pt-3 text-xs text-muted">
                  Outstanding <span class="font-semibold text-navy">{{ money(a.outstandingBalance) }}</span>
                </p>
              }
            </article>
          } @empty {
            <p class="mt-3 rounded-2xl border border-line bg-white p-4 text-sm text-muted shadow-soft">
              No space is linked to your account yet. The office that collects your fees can link it.
            </p>
          }

          <p class="mt-8 text-center text-[11px] leading-relaxed text-muted">
            An Official Receipt is issued by the office once your payment is validated.
          </p>
        }
      </main>

      <app-bottom-nav />
    </div>
  `,
})
export class Home {
  private readonly api = inject(PortalApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly accounts = signal<PayorBalance[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly name = computed(() => this.auth.name());
  readonly total = computed(() => this.accounts().reduce((sum, a) => sum + a.outstandingBalance, 0));
  readonly withBalance = computed(() => this.accounts().filter((a) => a.outstandingBalance > 0).length);

  money = peso;

  constructor() {
    void this.load();
  }

  async signOut(): Promise<void> {
    await this.auth.logout();
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
