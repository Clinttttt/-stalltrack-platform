import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';

/**
 * Faithful Angular port of the React <Privacy> page (route `/privacy`). Static legal content.
 * The React <Section> subcomponent is inlined per-use in the template. Wrapped in the same
 * App-shell chrome the React App renders for non-municipality routes: Navbar, Footer, BackToTop,
 * (the Navbar CTA links into the assessment flow).
 */
@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [Navbar, Footer],
  templateUrl: './privacy.html',
})
export class Privacy {
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
