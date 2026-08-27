import { Component, computed, inject, signal } from '@angular/core';
import { PayableItem, PortalApi } from '../../core/portal.api';
import { BottomNav } from '../../shared/bottom-nav';
import { peso } from '../../core/format';

/**
 * What the payor owes, item by item.
 *
 * A market stall can owe three different things in one month, and they are kept apart because they are collected
 * apart: the daily fees, the metered electricity and water, and a fish day whose kilos the payor declares. A daily
 * amount states the days it is made of, so ₱210 reads as seven days at ₱30 rather than a lump nobody can check.
 *
 * Paying is not offered here yet, and the screen says so rather than showing a button that cannot work. The gateway's
 * return address is fixed server-side, deliberately, so that a client cannot choose where a payor lands after
 * checkout; today it points at the office's existing portal.
 */
@Component({
  selector: 'app-balances',
  imports: [BottomNav],
  template: `
    <div class="p-shell">
      <main class="flex-1 px-5 pb-8">
        <header class="pt-6">
          <p class="text-[11px] font-bold uppercase leading-none tracking-[0.18em] text-gold">StallTrack</p>
          <h1 class="mt-2 font-display text-xl text-navy">Balances</h1>
          <p class="mt-1 text-xs text-muted">
            {{ items().length }} unpaid {{ items().length === 1 ? 'item' : 'items' }}
          </p>
        </header>

        @if (loading()) {
          <p class="mt-10 text-center text-sm text-muted">Reading your balances…</p>
        } @else if (error()) {
          <p class="mt-10 rounded-xl bg-red-bg px-4 py-3 text-sm text-red">{{ error() }}</p>
        } @else {
          <section class="mt-5 rounded-2xl border border-line bg-navy p-5 text-white shadow-soft">
            <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Total to pay</p>
            <p class="mt-1 font-display text-3xl">{{ money(total()) }}</p>
          </section>

          @for (item of items(); track key(item)) {
            <article class="mt-3 rounded-2xl border border-line bg-white p-4 shadow-soft">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-navy">{{ item.period }}</p>
                  <p class="mt-0.5 truncate text-xs text-muted">
                    {{ item.facility }}{{ item.stallNo ? ' · Stall ' + item.stallNo : '' }}{{ kindLabel(item.kind) }}
                  </p>
                  @if (item.kind === 'NpmDaily' && item.days && item.dailyRate) {
                    <p class="mt-1 text-xs text-muted">
                      {{ item.days }} {{ item.days === 1 ? 'day' : 'days' }} × {{ money(item.dailyRate) }}
                    </p>
                  }
                  @if (item.kind === 'NpmFish') {
                    <p class="mt-1 text-xs text-muted">
                      A fish day is priced from the kilos you declare, so it is paid one day at a time.
                    </p>
                  }
                </div>
                <div class="shrink-0 text-right">
                  <p class="font-display text-base text-navy">
                    {{ item.kind === 'NpmFish' ? money(item.baseFee ?? 0) + ' + kilos' : money(item.balanceDue) }}
                  </p>
                  @if (item.kind !== 'NpmFish') {
                    <button
                      class="mt-2 rounded-lg bg-navy px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      type="button"
                      [disabled]="paying() !== null"
                      (click)="pay(item)"
                    >
                      {{ paying() === key(item) ? 'Opening…' : 'Pay' }}
                    </button>
                  }
                </div>
              </div>
            </article>
          } @empty {
            <p class="mt-3 rounded-2xl border border-line bg-white p-4 text-sm text-muted shadow-soft">
              Nothing is outstanding. Anything collected today may take a moment to appear.
            </p>
          }

          @if (payError()) {
            <p class="mt-4 rounded-xl bg-red-bg px-4 py-3 text-sm text-red">{{ payError() }}</p>
          }

          <p class="mt-7 rounded-2xl border border-line bg-white p-4 text-xs leading-relaxed text-muted shadow-soft">
            Paying here opens the office's payment gateway. A fish day is declared with the collector at your stall,
            since its amount depends on the kilos weighed. An Official Receipt is issued by the office once your
            payment is validated.
          </p>
        }
      </main>

      <app-bottom-nav />
    </div>
  `,
})
export class Balances {
  private readonly api = inject(PortalApi);

  readonly items = signal<PayableItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** The item whose checkout is being opened, so two taps cannot start two payments. */
  readonly paying = signal<string | null>(null);
  readonly payError = signal<string | null>(null);

  /** Fish items carry no settled amount until kilos are declared, so they are left out of the total rather than counted as nothing. */
  readonly total = computed(() =>
    this.items()
      .filter((i) => i.kind !== 'NpmFish')
      .reduce((sum, i) => sum + i.balanceDue, 0),
  );

  constructor() {
    void this.load();
  }

  money = peso;

  /** One month of one stall can hold several kinds, so the kind belongs in the key. */
  key(item: PayableItem): string {
    return `${item.stallId}:${item.year}:${item.month}:${item.kind}`;
  }

  kindLabel(kind: PayableItem['kind']): string {
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

  private async load(): Promise<void> {
    try {
      this.items.set(await this.api.payableItems());
    } catch {
      this.error.set('Your balances could not be read just now. Try again in a moment.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Opens the office's gateway for one item.
   *
   * The whole page is left behind on purpose: the checkout is the gateway's, and the payor comes back to this portal
   * afterwards because the API decides the return address from the origin this app is served on.
   */
  async pay(item: PayableItem): Promise<void> {
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
}
