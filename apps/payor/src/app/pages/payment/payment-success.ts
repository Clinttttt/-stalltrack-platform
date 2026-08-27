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
  templateUrl: './payment-success.html',
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
