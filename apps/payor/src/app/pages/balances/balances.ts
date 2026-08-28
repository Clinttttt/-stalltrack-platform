import { Component, computed, inject, signal } from '@angular/core';
import { officeDayShort, officeMonth, peso } from '../../core/format';
import { PayableItem, PortalApi } from '../../core/portal.api';
import { PayorLayout } from '../../shared/payor-layout';

/**
 * What the payor owes, read as a statement.
 *
 * A market stall can owe three different things in one month, and they are kept apart because they are collected apart:
 * the daily fees, the metered electricity and water, and a fish day whose kilos the payor declares. Each row states what
 * it is, what it costs and what to do about it, and nothing else: this is a government bill, not an explanation.
 *
 * The total is the office's OWN figure, taken from the balances endpoint rather than summed from the rows. A fish month
 * carries no settled amount in its row (each of its days is priced from that day's kilos), so summing the rows reported
 * nothing owed while the Accounts screen and the office's stall profile both said otherwise.
 */
@Component({
  selector: 'app-balances',
  imports: [PayorLayout],
  templateUrl: './balances.html',
})
export class Balances {
  private readonly api = inject(PortalApi);

  protected readonly items = signal<PayableItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** The item whose checkout is being opened, so two taps cannot start two payments. */
  protected readonly paying = signal<string | null>(null);
  protected readonly payError = signal<string | null>(null);

  protected money = peso;
  protected month = officeMonth;
  protected dayLabel = officeDayShort;

  /** The fish item being declared for, and what the payor has said about it. */
  protected readonly fishItem = signal<PayableItem | null>(null);
  protected readonly fishDay = signal<string | null>(null);
  protected readonly fishKilos = signal<number | null>(null);

  /**
   * What the day will cost: the day's own fee, plus kilos at the office's own rate where it has set one.
   *
   * Computed here only so the payor can see it before committing. The API prices the day again at initiation, and that
   * figure is the one charged.
   */
  protected readonly fishTotal = computed(() => {
    const item = this.fishItem();
    if (!item) return 0;

    return (item.baseFee ?? 0) + (this.fishKilos() ?? 0) * (item.fishRatePerKilo ?? 0);
  });

  constructor() {
    void this.load();
  }

  /** What this row is for, in the office's own words. */
  protected label(item: PayableItem): string {
    switch (item.kind) {
      case 'NpmDaily':
        return 'Daily market fees';
      case 'NpmUtility':
        return 'Electricity and water';
      case 'NpmFish':
        return 'Fish day fees';
      default:
        return 'Monthly rent';
    }
  }

  /** The space it belongs to. */
  protected where(item: PayableItem): string {
    return item.stallNo ? `${item.facility} · Stall ${item.stallNo}` : item.facility;
  }

  /** The figure on the row: what is payable, or a day's fee where the days are paid one at a time. */
  protected shown(item: PayableItem): number {
    return item.kind === 'NpmFish' ? item.baseFee ?? 0 : item.balanceDue;
  }

  /** How the figure is made up, in as few words as it takes. */
  protected caption(item: PayableItem): string {
    if (item.kind === 'NpmFish') {
      const days = item.uncollectedDays?.length ?? 0;
      return days === 1 ? 'a day · 1 day owed' : `a day · ${days} days owed`;
    }

    if (item.kind === 'NpmDaily' && item.days && item.dailyRate) {
      return `${item.days} ${item.days === 1 ? 'day' : 'days'} × ${peso(item.dailyRate)}`;
    }

    return '';
  }

  /** Pay, or open the declaration sheet where the amount depends on what the payor declares. */
  protected act(item: PayableItem): void {
    if (item.kind === 'NpmFish') {
      this.openFish(item);
      return;
    }

    void this.pay(item);
  }

  protected openFish(item: PayableItem): void {
    this.payError.set(null);
    this.fishItem.set(item);
    // The earliest day still owed, which is the one the office would collect first.
    this.fishDay.set(item.uncollectedDays?.[0] ?? null);
    this.fishKilos.set(null);
  }

  protected closeFish(): void {
    this.fishItem.set(null);
    this.fishDay.set(null);
    this.fishKilos.set(null);
  }

  protected pickDay(day: string): void {
    this.fishDay.set(day);
  }

  protected setKilos(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim();
    if (raw === '') {
      this.fishKilos.set(null);
      return;
    }

    const kilos = Number(raw);
    // A negative weight is refused by the office, so it is not offered here either.
    this.fishKilos.set(Number.isFinite(kilos) && kilos >= 0 ? kilos : null);
  }

  /** Why kilos are asked for, which depends on whether the office prices them. */
  protected kilosHint(item: PayableItem): string {
    const rate = item.fishRatePerKilo ?? 0;
    return rate > 0
      ? `${peso(rate)} per kilo, on top of the day's fee.`
      : 'Your office charges no per-kilo fee. Recorded for its own count.';
  }

  /** The amount said out in its parts, so the payor can check it. */
  protected fishBreakdown(item: PayableItem): string {
    const base = peso(item.baseFee ?? 0);
    const kilos = this.fishKilos() ?? 0;
    const rate = item.fishRatePerKilo ?? 0;

    if (kilos <= 0) return `${base} for the day`;
    if (rate <= 0) return `${base} for the day · ${kilos} kg recorded`;
    return `${base} for the day · ${kilos} kg at ${peso(rate)}`;
  }

  /** Starts the checkout for the chosen day. Kilos left blank are zero, which the office accepts. */
  protected async payFish(item: PayableItem): Promise<void> {
    const day = this.fishDay();
    if (!day || this.paying() !== null) return;

    const dayOfMonth = Number(day.slice(-2));
    if (!Number.isFinite(dayOfMonth) || dayOfMonth < 1) {
      this.payError.set('That day could not be read. Pick it again.');
      return;
    }

    this.paying.set(this.key(item));
    this.payError.set(null);

    try {
      const { checkoutUrl } = await this.api.initiate(item, { day: dayOfMonth, kilos: this.fishKilos() ?? 0 });
      if (!checkoutUrl) throw new Error('no checkout address');
      window.location.assign(checkoutUrl);
    } catch {
      this.paying.set(null);
      this.payError.set('That payment could not be started just now. Try again, or pay the collector at your stall.');
    }
  }

  /** One month of one stall can hold several kinds, so the kind belongs in the key. */
  protected key(item: PayableItem): string {
    return `${item.stallId}:${item.year}:${item.month}:${item.kind}`;
  }

  /**
   * Opens the office's gateway for one item.
   *
   * The whole page is left behind on purpose: the checkout is the gateway's, and the payor returns to this portal
   * afterwards because the API decides the return address from the origin this app is served on.
   */
  protected async pay(item: PayableItem): Promise<void> {
    if (this.paying() !== null) return;

    this.paying.set(this.key(item));
    this.payError.set(null);

    try {
      const { checkoutUrl } = await this.api.initiate(item);
      if (!checkoutUrl) throw new Error('no checkout address');
      window.location.assign(checkoutUrl);
    } catch {
      this.paying.set(null);
      this.payError.set('That payment could not be started just now. Try again, or pay the collector at your stall.');
    }
  }

  private async load(): Promise<void> {
    try {
      // Both, together: the rows come from the payable items, the total from the office's own balances, and neither is
      // derived from the other. Read in parallel because a payor on mobile data waits for both.
      const [items, balances] = await Promise.all([this.api.payableItems(), this.api.balances()]);
      this.items.set(items);
      this.total.set(balances.reduce((sum, b) => sum + b.outstandingBalance, 0));
    } catch {
      this.error.set('Your balances could not be read just now. Try again in a moment.');
    } finally {
      this.loading.set(false);
    }
  }
}
