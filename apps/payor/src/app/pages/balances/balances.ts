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

  /** The fish item being declared for, and how much of it the payor is settling. */
  protected readonly fishItem = signal<PayableItem | null>(null);

  /**
   * How many of the owed days are being paid, counted from the earliest.
   *
   * A count, not a set: the office settles a daily-billed month oldest first, so paying a later day while an earlier one
   * stayed open would leave an arrear behind a settled day. Tapping a day therefore takes that day and everything before
   * it, which is what the office's own collectors do when they settle several days at once.
   */
  protected readonly fishDayCount = signal(1);

  /**
   * The kilos declared against each day, by that day's own date.
   *
   * Per day, because a fish day costs the stall's daily fee plus THAT day's weighing fee. Kept by date rather than by
   * position so a day keeps what was typed for it when the selection grows or shrinks.
   */
  protected readonly fishKilosByDay = signal<Record<string, number | null>>({});

  /** The days being paid for, earliest first. */
  protected readonly fishDays = computed(() => (this.fishItem()?.uncollectedDays ?? []).slice(0, this.fishDayCount()));

  /** The kilos declared across the selected days, for the line under the amount. */
  protected readonly fishKilosTotal = computed(() => {
    const kilos = this.fishKilosByDay();
    return this.fishDays().reduce((sum, day) => sum + (kilos[day] ?? 0), 0);
  });

  /**
   * What this will cost: each day's own fee, plus that day's kilos at the office's rate where it has set one.
   *
   * Computed here only so the payor can see it before committing. The API prices every day again at initiation, and those
   * figures are the ones charged.
   */
  protected readonly fishTotal = computed(() => {
    const item = this.fishItem();
    if (!item) return 0;

    const base = item.baseFee ?? 0;
    const rate = item.fishRatePerKilo ?? 0;
    const kilos = this.fishKilosByDay();

    return this.fishDays().reduce((sum, day) => sum + base + (kilos[day] ?? 0) * rate, 0);
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
    this.fishDayCount.set(1);
    this.fishKilosByDay.set({});
  }

  protected closeFish(): void {
    this.fishItem.set(null);
    this.fishDayCount.set(1);
    this.fishKilosByDay.set({});
  }

  /** Whether a day is included: it is, once the payor has reached down to it or past it. */
  protected isPicked(index: number): boolean {
    return index < this.fishDayCount();
  }

  /** Tapping a day pays up to and including it. Tapping the last one included leaves only the days before it. */
  protected pickThrough(index: number): void {
    this.payError.set(null);
    const count = index + 1;
    this.fishDayCount.set(this.fishDayCount() === count && count > 1 ? count - 1 : count);
  }

  /** All of them, for the payor settling everything owed this month. */
  protected pickAll(item: PayableItem): void {
    this.payError.set(null);
    this.fishDayCount.set(item.uncollectedDays?.length ?? 1);
  }

  /** What has been declared for one day, for its own input. */
  protected kilosFor(day: string): number | null {
    return this.fishKilosByDay()[day] ?? null;
  }

  protected setKilosFor(day: string, event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim();
    const kilos = raw === '' ? null : Number(raw);

    this.fishKilosByDay.update((all) => ({
      ...all,
      // A negative weight is refused by the office, so it is not offered here either.
      [day]: kilos !== null && Number.isFinite(kilos) && kilos >= 0 ? kilos : null,
    }));
  }

  /** Why kilos are asked for, which depends on whether the office prices them. */
  protected kilosHint(item: PayableItem): string {
    const rate = item.fishRatePerKilo ?? 0;
    return rate > 0
      ? `${peso(rate)} per kilo, on top of each day's fee.`
      : 'Your office charges no per-kilo fee. Recorded for its own count.';
  }

  /** The amount said out in its parts, so the payor can check it. */
  protected fishBreakdown(item: PayableItem): string {
    const base = peso(item.baseFee ?? 0);
    const count = this.fishDayCount();
    const kilos = this.fishKilosTotal();
    const rate = item.fishRatePerKilo ?? 0;

    const days = count === 1 ? `${base} for the day` : `${count} days at ${base}`;
    if (kilos <= 0) return days;
    if (rate <= 0) return `${days} · ${kilos} kg recorded`;
    return `${days} · ${kilos} kg at ${peso(rate)}`;
  }

  /**
   * Starts the checkout for the days chosen, each with the kilos declared for it.
   *
   * One shape for one day and for several: the API recognises a single day from the single entry and takes the
   * day-at-a-time path, so nothing here has to know which is which.
   */
  protected async payFish(item: PayableItem): Promise<void> {
    if (this.paying() !== null) return;

    const days = this.fishDays();
    if (days.length === 0) return;

    const kilos = this.fishKilosByDay();
    const fishDays = days.map((day) => ({ day: Number(day.slice(-2)), kilos: kilos[day] ?? 0 }));

    if (fishDays.some((d) => !Number.isFinite(d.day) || d.day < 1)) {
      this.payError.set('Those days could not be read. Pick them again.');
      return;
    }

    this.paying.set(this.key(item));
    this.payError.set(null);

    try {
      const { checkoutUrl } = await this.api.initiate(item, { fishDays });
      if (!checkoutUrl) throw new Error('no checkout address');
      window.location.assign(checkoutUrl);
    } catch (error: unknown) {
      this.paying.set(null);
      // The office's own refusal is preferred where it sent one: a day collected at the stall since the payor looked is
      // something they need told, not something to hide behind a general apology.
      const message = (error as { error?: { error?: string; message?: string } } | null)?.error;
      this.payError.set(
        message?.error ??
          message?.message ??
          'That payment could not be started just now. Try again, or pay the collector at your stall.',
      );
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
