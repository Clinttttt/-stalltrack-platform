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
  templateUrl: './payment-cancelled.html',
})
export class PaymentCancelled {}
