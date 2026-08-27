import { Component, computed, inject, signal } from '@angular/core';
import { officeDate, peso } from '../../core/format';
import { PayableItem, PortalApi } from '../../core/portal.api';
import { PayorLayout } from '../../shared/payor-layout';

/**
 * What the payor owes, item by item.
 *
 * A market stall can owe three different things in one month, and they are kept apart because they are collected apart:
 * the daily fees, the metered electricity and water, and a fish day whose kilos the payor declares. A daily amount
 * states the days it is made of, so ₱210 reads as seven days at ₱30 rather than a lump nobody can check.
 */
@Component({
  selector: 'app-balances',
  imports: [PayorLayout],
  templateUrl: './balances.html',
})
export class Balances {
  private readonly api = inject(PortalApi);

  protected readonly items = signal<PayableItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** The item whose checkout is being opened, so two taps cannot start two payments. */
  protected readonly paying = signal<string | null>(null);
  protected readonly payError = signal<string | null>(null);

  /** A fish day carries no settled amount until kilos are declared, so it is left out rather than counted as nothing. */
  protected readonly total = computed(() =>
    this.items()
      .filter((i) => i.kind !== 'NpmFish')
      .reduce((sum, i) => sum + i.balanceDue, 0),
  );

  protected money = peso;
  protected date = officeDate;

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

    const base = item.baseFee ?? 0;
    const rate = item.fishRatePerKilo ?? 0;
    const kilos = this.fishKilos() ?? 0;
    return base + kilos * rate;
  });

  constructor() {
    void this.load();
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

  protected pickDay(event: Event): void {
    this.fishDay.set((event.target as HTMLSelectElement).value || null);
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

  /** The kilos line under the preview, said plainly and omitted when there is nothing to say. */
  protected kilosLine(item: PayableItem): string {
    const kilos = this.fishKilos() ?? 0;
    const rate = item.fishRatePerKilo ?? 0;

    if (kilos <= 0) return '';
    if (rate <= 0) return `, and ${kilos} kg recorded`;
    return `, and ${kilos} kg at ${peso(rate)}`;
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

  protected kindLabel(kind: PayableItem['kind']): string {
    switch (kind) {
      case 'NpmDaily':
        return ' · Daily fees';
      case 'NpmUtility':
        return ' · Electricity & Water';
      case 'NpmFish':
        return ' · Fish daily fee';
      default:
        return '';
    }
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
      this.items.set(await this.api.payableItems());
    } catch {
      this.error.set('Your balances could not be read just now. Try again in a moment.');
    } finally {
      this.loading.set(false);
    }
  }
}
