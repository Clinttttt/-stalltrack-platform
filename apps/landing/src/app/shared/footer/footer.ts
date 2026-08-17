import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Faithful Angular port of the React <Footer>. Static navy footer with product/company links. */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
})
export class Footer {
  readonly year = new Date().getFullYear();

  /**
   * Drops the product marketing - the StallTrack seal, the "GovTech SaaS platform" blurb, and the Product/Company
   * link columns - keeping only the copyright bar and the legal links.
   *
   * For pages that belong to a MUNICIPALITY rather than to the product. A page headed "Municipality of Carrascal"
   * should not carry the vendor's emblem and a Features/Use Cases/Product Preview menu underneath it; the office
   * asked for exactly that to come off. Privacy Policy and Terms of Service stay, because they are legal notices a
   * public page should always reach, not marketing.
   */
  readonly slim = input(false);
}
