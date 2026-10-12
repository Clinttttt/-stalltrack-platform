import { Component, afterNextRender } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';

/**
 * Public StallTrack landing page. Marketing copy only: no figures, no sample data, no claims about
 * any municipality. The assessment itself lives behind "/municipalities" (select municipality, then
 * the assessment request), so every call to action here is a plain link into that flow.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './home.html',
})
export class Home {
  readonly flow = [
    { title: 'Register the source', text: "Stalls, spaces and other collectable sources are kept in your office's own register." },
    { title: 'Collect', text: 'Collectors record payments in the field; the office records them at the counter.' },
    { title: 'Keep the record', text: 'Every collection stays tied to its official receipt or collection document.' },
    { title: 'Report', text: 'Monthly income and monitoring come from the same records.' },
  ] as const;

  readonly features = [
    { title: 'Collection operations', text: 'Daily and periodic collections for the market, rentals, terminal, slaughterhouse and other operations your office runs.' },
    { title: 'Registered sources and accounts', text: 'A stable register of stalls, spaces, vendors and accounts, so each payment belongs to the right one.' },
    { title: 'Records and accountability', text: 'Official receipts and collection documents, with remittance and history kept alongside each collection.' },
    { title: 'Reports and monitoring', text: 'Monthly income and collection activity organized the way your office already reports.' },
    { title: 'Mobile collection', text: 'Assigned Collectors work from a phone app limited to the operations they are authorized for.' },
  ] as const;

  readonly steps = [
    { title: 'Request an assessment', text: 'Tell us about your municipality and the operations your office runs.' },
    { title: 'Configure the office', text: 'Your office confirms its operations, facilities and Head account details.' },
    { title: 'Review and activate', text: 'The setup is reviewed before your portal is activated.' },
    { title: 'Begin operations', text: 'Your Head signs in, assigns Collectors and starts collecting.' },
  ] as const;

  constructor() {
    afterNextRender(() => {
      // Initial-load anchors (e.g. /#features) once the page has rendered.
      const hash = window.location.hash;
      if (!hash) return;
      const target = document.getElementById(hash.slice(1));
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      }
    });
  }
}
