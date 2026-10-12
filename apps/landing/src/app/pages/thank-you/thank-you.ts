import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';

/**
 * Faithful Angular port of the React <ThankYou> page (route `/thanks`). Static confirmation card
 * with a "Return to StallTrack" link back to `/`. Wrapped in the same App-shell chrome the React
 * App renders for non-municipality routes: Navbar, Footer and BackToTop.
 */
@Component({
  selector: 'app-thank-you',
  standalone: true,
  imports: [Navbar, Footer, RouterLink],
  templateUrl: './thank-you.html',
})
export class ThankYou {
  private readonly destroyRef = inject(DestroyRef);

  readonly showBackToTop = signal(false);

  constructor() {
    afterNextRender(() => {
      const onScroll = () => this.showBackToTop.set(window.scrollY > 600);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
