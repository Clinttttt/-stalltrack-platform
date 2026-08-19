import { Component, DestroyRef, HostListener, afterNextRender, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface NavLink {
  href: string;
  label: string;
  /** Set for in-app pages so navigation stays client-side; anchors keep using `href`. */
  route?: string;
}

/**
 * Sticky site header that gains a border/shadow on scroll, a desktop link row + "Request a Demo"
 * CTA, and a mobile toggle menu. Anchor links scroll within the landing page; entries with a
 * `route` navigate client-side. The CTA is surfaced through the `requestDemo` output.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly destroyRef = inject(DestroyRef);

  /** Mirrors the React `onRequestDemo` prop. */
  readonly requestDemo = output<void>();

  readonly open = signal(false);
  readonly scrolled = signal(false);

  readonly links: ReadonlyArray<NavLink> = [
    { href: '/#features', label: 'Features' },
    { href: '/#facilities', label: 'Facilities' },
    { href: '/#usecases', label: 'Use Cases' },
    { href: '/#preview', label: 'Product' },
    { href: '/#security', label: 'Security' },
    { href: '/municipalities', label: 'Municipalities', route: '/municipalities' },
    { href: '/#contact', label: 'Contact' },
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

  navigateToContact(event: Event): void {
    event.preventDefault();

    const target = document.getElementById('contact');
    if (!target) {
      window.location.assign('/#contact');
      return;
    }

    window.history.pushState(null, '', '/#contact');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onDesktopLinkClick(link: NavLink, event: Event): void {
    if (link.href === '/#contact') this.navigateToContact(event);
  }

  onMobileLinkClick(link: NavLink, event: Event): void {
    this.open.set(false);
    if (link.href === '/#contact') this.navigateToContact(event);
  }

  onMobileCta(): void {
    this.open.set(false);
    this.requestDemo.emit();
  }
}
