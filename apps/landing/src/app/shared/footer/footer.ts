import { Component } from '@angular/core';
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
}
