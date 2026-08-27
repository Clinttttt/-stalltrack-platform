import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Where the gateway returns a payor who backed out of checkout.
 *
 * Nothing is asked of the API: a cancelled checkout charged nothing, and the balance the payor came from is unchanged.
 * Saying so plainly matters, because a payor who is unsure whether money left their account will pay twice.
 */
@Component({
  selector: 'app-payment-cancelled',
  imports: [RouterLink],
  template: `
    <main class="p-shell items-center justify-center px-6 text-center">
      <h1 class="font-display text-2xl text-navy">Payment cancelled</h1>
      <p class="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        Nothing was charged and your balance is unchanged. You can try again, or pay the collector at your stall.
      </p>

      <a class="mt-8 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white" routerLink="/balances">
        Back to balances
      </a>
    </main>
  `,
})
export class PaymentCancelled {}
