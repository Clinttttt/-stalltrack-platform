import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { Reveal } from '../../shared/reveal/reveal';
import { DemoRequestModal } from '../../shared/demo-request-modal/demo-request-modal';
import { RepresentativeContactModal } from '../../shared/representative-contact-modal/representative-contact-modal';

/**
 * Public StallTrack landing page (marketing only, fictional sample data) plus the shell that
 * surrounds it: Navbar, Footer, BackToTop button, and the demo-request / representative-contact
 * modals. The Navbar's `requestDemo` output opens the demo modal.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, Navbar, Footer, Reveal, DemoRequestModal, RepresentativeContactModal],
  templateUrl: './home.html',
})
export class Home {
  private readonly destroyRef = inject(DestroyRef);

  readonly demoModalOpen = signal(false);
  readonly contactModalOpen = signal(false);

  /** BackToTop visibility (shown past 600px of scroll). */
  readonly showBackToTop = signal(false);

  constructor() {
    afterNextRender(() => {
      const onScroll = () => this.showBackToTop.set(window.scrollY > 600);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));

      // Handle initial-load anchors (e.g. /#features) once the page has rendered.
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

  openContact(): void {
    this.contactModalOpen.set(true);
  }

  closeContact(): void {
    this.contactModalOpen.set(false);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
