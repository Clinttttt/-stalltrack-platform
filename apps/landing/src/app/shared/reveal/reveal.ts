import { Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * Fades + slides the host element in when it scrolls into view.
 * Honors prefers-reduced-motion (shows immediately, no transform).
 *
 * Faithful Angular port of the React <Reveal> component, implemented as an attribute
 * directive so any element can opt in: `<div reveal [delay]="120"> … </div>`.
 */
@Directive({
  selector: '[reveal]',
  standalone: true,
})
export class Reveal {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Transition delay in milliseconds (mirrors the React `delay` prop). */
  readonly delay = input(0);

  constructor() {
    const el = this.host.nativeElement;
    // Base transition + initial hidden state (matches the React className logic).
    el.classList.add('transition-all', 'duration-700', 'ease-out', 'translate-y-6', 'opacity-0');

    afterNextRender(() => {
      el.style.transitionDelay = `${this.delay()}ms`;

      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        this.show(el);
        return;
      }

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.show(el);
            obs.disconnect();
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      );
      obs.observe(el);
    });
  }

  private show(el: HTMLElement): void {
    el.classList.remove('translate-y-6', 'opacity-0');
    el.classList.add('translate-y-0', 'opacity-100');
  }
}
