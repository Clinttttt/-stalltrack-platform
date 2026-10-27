import { Component, HostListener, inject, signal } from '@angular/core';
import { facilityLabel, officeDate, officeMonth, peso } from '../../core/format';
import { HistoryMonth, PayorBalance, PortalApi } from '../../core/portal.api';
import { PayorLayout } from '../../shared/payor-layout';

/** A space's authoritative history rows, scoped to the signed-in payor by the API. */
interface AccountHistory {
  account: PayorBalance;
  months: HistoryMonth[];
}

/** A read-only statement for exactly one space and period; never a substitute for a physical OR. */
interface SelectedHistory {
  account: PayorBalance;
  month: HistoryMonth;
}

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
  protected readonly selected = signal<SelectedHistory | null>(null);

  protected money = peso;
  protected facilityLabel = facilityLabel;
  protected date = officeDate;
  protected monthLabel = officeMonth;

  constructor() {
    void this.load();
  }

  /** Unpaid periods show the bill; paid or partial periods show the money actually recorded. */
  protected shown(month: HistoryMonth): number {
    return month.status === 'Unpaid' ? month.totalBill : month.amountPaid;
  }

  protected statusClass(month: HistoryMonth): string {
    if (month.isExcused) return 'text-muted';
    if (month.status === 'Paid') return 'text-green';
    if (month.status === 'Partial') return 'text-amber';
    return 'text-red';
  }

  protected openDetail(account: PayorBalance, month: HistoryMonth): void {
    this.selected.set({ account, month });
  }

  protected closeDetail(): void {
    this.selected.set(null);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeDetail();
  }

  private async load(): Promise<void> {
    try {
      const accounts = await this.api.balances();
      // One request per linked space. The server authorizes each requested stall for the current payor.
      const months = await Promise.all(accounts.map((a) => this.api.history(a.stallId)));
      this.ledgers.set(accounts.map((account, i) => ({ account, months: months[i] ?? [] })));
    } catch {
      this.error.set('Your history could not be read just now. Try again in a moment.');
    } finally {
      this.loading.set(false);
    }
  }
}
