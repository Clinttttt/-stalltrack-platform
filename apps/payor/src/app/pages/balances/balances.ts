import { Component, computed, inject, signal } from '@angular/core';
import { peso } from '../../core/format';
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

  constructor() {
    void this.load();
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
