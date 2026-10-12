import { Component, DestroyRef, HostListener, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface NavLink {
  href: string;
  label: string;
  /** Set for in-app pages so navigation stays client-side; anchors keep using `href`. */
  route?: string;
}

/**
 * Sticky public header: the StallTrack mark, three links that all lead somewhere real, and one primary action.
 * "Request an assessment" goes to the municipality selector, the start of the existing assessment flow
 * (select municipality, then the assessment request); the header never submits anything itself.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly destroyRef = inject(DestroyRef);

  readonly open = signal(false);
  readonly scrolled = signal(false);

  readonly links: ReadonlyArray<NavLink> = [
    { href: '/#features', label: 'Features' },
    { href: '/#how', label: 'How it works' },
    { href: '/municipalities', label: 'Municipalities', route: '/municipalities' },
  ];

  constructor() {
    afterNextRender(() => {
      const onScroll = () => this.scrolled.set(window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  closeMenu(): void {
    this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.closeMenu();
  }
}
