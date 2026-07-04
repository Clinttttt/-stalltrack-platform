import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { DemoRequestModal } from '../../shared/demo-request-modal/demo-request-modal';

/**
 * Faithful Angular port of the React <Privacy> page (route `/privacy`). Static legal content.
 * The React <Section> subcomponent is inlined per-use in the template. Wrapped in the same
 * App-shell chrome the React App renders for non-municipality routes: Navbar, Footer, BackToTop,
 * and the demo-request modal (opened from the Navbar CTA).
 */
@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [Navbar, Footer, DemoRequestModal],
  templateUrl: './privacy.html',
})
export class Privacy {
  private readonly destroyRef = inject(DestroyRef);

  readonly demoModalOpen = signal(false);
  readonly showBackToTop = signal(false);

  constructor() {
    afterNextRender(() => {
      const onScroll = () => this.showBackToTop.set(window.scrollY > 600);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });
  }

  openDemo(): void {
    this.demoModalOpen.set(true);
  }

  closeDemo(): void {
    this.demoModalOpen.set(false);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
