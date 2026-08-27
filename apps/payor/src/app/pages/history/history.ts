import { Component, inject, signal } from '@angular/core';
import { HistoryMonth, PayorBalance, PortalApi } from '../../core/portal.api';
import { BottomNav } from '../../shared/bottom-nav';
import { officeDate, peso } from '../../core/format';

/** One space's ledger, kept beside the space it belongs to so a payor with two stalls can tell them apart. */
interface AccountHistory {
  account: PayorBalance;
  months: HistoryMonth[];
}

/**
 * What the payor has paid.
 *
 * A market month reaches them as one row, because that is how the office reconciles it, but the days behind it are
 * listed on request: each date, its own fee, the receipt where one has been encoded, and who took it. A day a
 * collector took in the field reads exactly like one paid online, which is the point.
 */
@Component({
  selector: 'app-history',
  imports: [BottomNav],
  template: `
    <div class="p-shell">
      <main class="flex-1 px-5 pb-8">
        <header class="pt-6">
          <p class="text-[11px] font-bold uppercase leading-none tracking-[0.18em] text-gold">StallTrack</p>
          <h1 class="mt-2 font-display text-xl text-navy">Payment history</h1>
        </header>

        @if (loading()) {
          <p class="mt-10 text-center text-sm text-muted">Reading your history…</p>
        } @else if (error()) {
          <p class="mt-10 rounded-xl bg-red-bg px-4 py-3 text-sm text-red">{{ error() }}</p>
        } @else {
          @for (entry of ledgers(); track entry.account.stallId) {
            <p class="mt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {{ entry.account.facility }}{{ entry.account.stallNo ? ' · Stall ' + entry.account.stallNo : '' }}
            </p>

            <div class="mt-2 rounded-2xl border border-line bg-white shadow-soft">
              @for (month of entry.months; track month.period) {
                <div class="border-b border-line last:border-b-0">
                  <div class="flex items-start justify-between gap-3 px-4 py-3">
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-navy">{{ month.period }}</p>
                      <p class="mt-0.5 truncate text-xs text-muted">
                        @if (month.orNumber) {
                          OR {{ month.orNumber }}
                        } @else if (month.status !== 'Unpaid' && !month.isExcused) {
                          awaiting OR
                        } @else {
                          &nbsp;
                        }
                      </p>
                    </div>
                    <div class="shrink-0 text-right">
                      <p class="font-display text-base text-navy">{{ money(shown(month)) }}</p>
                      <p class="text-[10px] font-semibold uppercase tracking-wide"
                         [class]="month.isExcused ? 'text-muted' : month.status === 'Paid' ? 'text-green' : month.status === 'Partial' ? 'text-amber' : 'text-red'">
                        {{ month.isExcused ? 'Excused' : month.status }}
                      </p>
                    </div>
                  </div>

                  @if (month.days && month.days.length > 0) {
                    <div class="px-4 pb-3">
                      <button
                        class="pb-1 text-[11px] text-muted"
                        type="button"
                        (click)="toggle(entry.account.stallId, month.period)"
                      >
                        {{ month.days.length }} {{ month.days.length === 1 ? 'day' : 'days' }} collected
                        <span class="font-semibold text-navy">
                          {{ expanded(entry.account.stallId, month.period) ? 'Hide' : 'Show' }}
                        </span>
                      </button>

                      @if (expanded(entry.account.stallId, month.period)) {
                        @for (day of month.days; track day.day) {
                          <div class="flex items-baseline gap-2 border-l-2 border-line py-1.5 pl-2.5 text-[11.5px]">
                            <span class="w-[92px] shrink-0 text-navy">{{ date(day.day) }}</span>
                            <span class="min-w-0 flex-1 truncate text-muted">
                              {{ day.orNumber ? 'OR ' + day.orNumber : 'awaiting OR' }}{{ day.recordedByName ? ' · ' + day.recordedByName : '' }}
                            </span>
                            <span class="shrink-0 font-semibold text-navy">{{ money(day.amount) }}</span>
                          </div>
                        }
                      }
                    </div>
                  }
                </div>
              } @empty {
                <p class="px-4 py-4 text-sm text-muted">No payments recorded for this space yet.</p>
              }
            </div>
          } @empty {
            <p class="mt-4 rounded-2xl border border-line bg-white p-4 text-sm text-muted shadow-soft">
              No space is linked to your account yet. The office that collects your fees can link it.
            </p>
          }
        }
      </main>

      <app-bottom-nav />
    </div>
  `,
})
export class History {
  private readonly api = inject(PortalApi);

  readonly ledgers = signal<AccountHistory[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** Which months have their days open, keyed by space and period so one month at two stalls is two rows. */
  private readonly open = signal<ReadonlySet<string>>(new Set<string>());

  money = peso;
  date = officeDate;

  constructor() {
    void this.load();
  }

  /** An unpaid month shows what is owed; anything else shows what was received. */
  shown(month: HistoryMonth): number {
    return month.status === 'Unpaid' ? month.totalBill : month.amountPaid;
  }

  expanded(stallId: string, period: string): boolean {
    return this.open().has(`${stallId}|${period}`);
  }

  toggle(stallId: string, period: string): void {
    const key = `${stallId}|${period}`;
    const next = new Set(this.open());
    if (!next.delete(key)) next.add(key);
    this.open.set(next);
  }

  private async load(): Promise<void> {
    try {
      const accounts = await this.api.balances();
      // One request per space, in parallel: a payor holds one or two, and the API scopes each to the caller.
      const months = await Promise.all(accounts.map((a) => this.api.history(a.stallId)));
      this.ledgers.set(accounts.map((account, i) => ({ account, months: months[i] ?? [] })));
    } catch {
      this.error.set('Your history could not be read just now. Try again in a moment.');
    } finally {
      this.loading.set(false);
    }
  }
}
