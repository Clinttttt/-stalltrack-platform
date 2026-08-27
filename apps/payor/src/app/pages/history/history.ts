import { Component, inject, signal } from '@angular/core';
import { officeDate, peso } from '../../core/format';
import { HistoryMonth, PayorBalance, PortalApi } from '../../core/portal.api';
import { PayorLayout } from '../../shared/payor-layout';

/** One space's ledger, kept beside the space it belongs to so a payor with two stalls can tell them apart. */
interface AccountHistory {
  account: PayorBalance;
  months: HistoryMonth[];
}

/**
 * What the payor has paid.
 *
 * A market month reaches them as one row, because that is how the office reconciles it, but the days behind it are
 * listed on request: each date, its own fee, the receipt where one has been encoded, and who took it. A day a collector
 * took in the field reads exactly like one paid online, which is the point.
 */
@Component({
  selector: 'app-history',
  imports: [PayorLayout],
  templateUrl: './history.html',
})
export class History {
  private readonly api = inject(PortalApi);

  protected readonly ledgers = signal<AccountHistory[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Which months have their days open, keyed by space and period so one month at two stalls is two rows. */
  private readonly open = signal<ReadonlySet<string>>(new Set<string>());

  protected money = peso;
  protected date = officeDate;

  constructor() {
    void this.load();
  }

  /** An unpaid month shows what is owed; anything else shows what was received. */
  protected shown(month: HistoryMonth): number {
    return month.status === 'Unpaid' ? month.totalBill : month.amountPaid;
  }

  protected statusClass(month: HistoryMonth): string {
    if (month.isExcused) return 'text-muted';
    if (month.status === 'Paid') return 'text-green';
    if (month.status === 'Partial') return 'text-amber';
    return 'text-red';
  }

  protected expanded(stallId: string, period: string): boolean {
    return this.open().has(`${stallId}|${period}`);
  }

  protected toggle(stallId: string, period: string): void {
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
