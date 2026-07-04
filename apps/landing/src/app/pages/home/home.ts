import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { Reveal } from '../../shared/reveal/reveal';
import { DemoRequestModal } from '../../shared/demo-request-modal/demo-request-modal';
import { FounderContactModal } from '../../shared/founder-contact-modal/founder-contact-modal';

/**
 * Public StallTrack landing page. Faithful Angular port of the React <Home> page (marketing only,
 * fictional sample data) plus the App-shell chrome that surrounds it for this route: Navbar,
 * Footer, BackToTop button, and the demo / founder-contact modals.
 *
 * React `onRequestDemo` / `onContactFounder` (passed from App) become local modal signals; the
 * Navbar's `requestDemo` output opens the demo modal, mirroring App.jsx.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Navbar, Footer, Reveal, DemoRequestModal, FounderContactModal],
  templateUrl: './home.html',
})
export class Home {
  private readonly destroyRef = inject(DestroyRef);

  readonly demoModalOpen = signal(false);
  readonly founderModalOpen = signal(false);

  /** BackToTop visibility (React `show = window.scrollY > 600`). */
  readonly showBackToTop = signal(false);

  constructor() {
    afterNextRender(() => {
      const onScroll = () => this.showBackToTop.set(window.scrollY > 600);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));

      // Mirror App.jsx ScrollToTop hash handling for initial-load anchors (e.g. /#features).
      const hash = window.location.hash;
      if (hash) {
        const target = document.getElementById(hash.slice(1));
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
        }
      }
    });
  }

  openDemo(): void {
    this.demoModalOpen.set(true);
  }

  closeDemo(): void {
    this.demoModalOpen.set(false);
  }

  openFounder(): void {
    this.founderModalOpen.set(true);
  }

  closeFounder(): void {
    this.founderModalOpen.set(false);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
