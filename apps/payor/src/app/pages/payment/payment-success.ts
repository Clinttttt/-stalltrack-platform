import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PortalApi } from '../../core/portal.api';

/**
 * Where the gateway returns a payor after a successful checkout.
 *
 * What settles a payment is the gateway's own webhook to the API, not this screen, so the screen asks the API for the
 * outcome and reports what it is told. A payor who arrives before the webhook has landed is told the payment is being
 * confirmed rather than that it failed, and the office's record is the one that decides either way.
 */
@Component({
  selector: 'app-payment-success',
  imports: [RouterLink],
  template: `
    <main class="p-shell items-center justify-center px-6 text-center">
      @switch (state()) {
        @case ('confirming') {
          <p class="font-display text-xl text-navy">Confirming your payment…</p>
          <p class="mt-2 text-sm text-muted">This takes a moment. Please do not close this page.</p>
        }
        @case ('paid') {
          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-green-bg">
            <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="#2d7a5f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 class="mt-4 font-display text-2xl text-navy">Payment received</h1>
          <p class="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Your account has been credited. The office issues your Official Receipt once it validates the payment.
          </p>
        }
        @case ('pending') {
          <h1 class="font-display text-2xl text-navy">Payment is being confirmed</h1>
          <p class="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            The gateway has your payment and the office's record is catching up. Your balances will show it shortly. No
            need to pay again.
          </p>
        }
        @case ('failed') {
          <h1 class="font-display text-2xl text-navy">Payment not completed</h1>
          <p class="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Nothing was charged. You can try again, or pay the collector at your stall.
          </p>
        }
      }

      <a class="mt-8 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white" routerLink="/balances">
        Back to balances
      </a>
    </main>
  `,
})
export class PaymentSuccess {
  private readonly api = inject(PortalApi);
  private readonly router = inject(Router);

  readonly state = signal<'confirming' | 'paid' | 'pending' | 'failed'>('confirming');

  constructor() {
    void this.confirm();
  }

  private async confirm(): Promise<void> {
    const reference = new URLSearchParams(window.location.search).get('ref');
    if (!reference) {
      // No reference to ask about. Never reported as a failure: the money may well have been taken.
      this.state.set('pending');
      return;
    }

    // The webhook has usually landed before the payor returns. Retried briefly, and only briefly, for the race.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const result = await this.api.confirm(reference);
        if (result.settled) {
          this.state.set('paid');
          return;
        }
        if (result.status?.toLowerCase() === 'failed') {
          this.state.set('failed');
          return;
        }
      } catch {
        // A refused confirmation is not evidence the payment failed, so the loop simply tries again.
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    this.state.set('pending');
  }
}
