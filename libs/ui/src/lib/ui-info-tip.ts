import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, afterRenderEffect, inject, input, signal, viewChild } from '@angular/core';
import { UiIcon } from './ui-icon';

let nextId = 0;

/**
 * The hover-info icon: where a page used to carry a paragraph of explanation, it carries this instead.
 *
 *   <h2>Declared operations <ui-info-tip text="These become the municipality's operation list. Nothing is activated by declaring one." /></h2>
 *
 * Opens on hover, on keyboard focus and on tap; closes on Esc, on leaving, and on a tap outside. The text is one or two sentences,
 * never a heading or a list. It never carries what the reader MUST see (consent, a financial-authority restriction, a validation
 * requirement, an error reason): that stays on the page.
 */
@Component({
  selector: 'ui-info-tip',
  standalone: true,
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative inline-flex align-middle',
    '(mouseenter)': 'hovering.set(true)',
    '(mouseleave)': 'hovering.set(false)',
  },
  template: `
    <button
      type="button"
      class="grid h-5 w-5 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-civic-soft hover:text-civic focus-visible:bg-civic-soft focus-visible:text-civic"
      [attr.aria-label]="label()"
      [attr.aria-describedby]="visible() ? id : null"
      [attr.aria-expanded]="visible()"
      (click)="toggle()"
      (focus)="focused.set(true)"
      (blur)="focused.set(false)"
    >
      <ui-icon name="info" className="h-4 w-4" />
    </button>
    @if (visible()) {
      <span
        #tip
        [id]="id"
        role="tooltip"
        class="pointer-events-none absolute left-1/2 z-50 w-max max-w-[17.5rem] -translate-x-1/2 animate-ui-pop rounded-md bg-ink px-3 py-2 text-left text-[0.8125rem] font-normal normal-case leading-snug tracking-normal text-white shadow-card"
        [class]="side() === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'"
      >
        {{ text() }}
      </span>
    }
  `,
})
export class UiInfoTip {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly text = input.required<string>();
  /** The accessible name of the button, e.g. "About declared operations". */
  readonly label = input('More information');
  readonly side = input<'top' | 'bottom'>('top');

  protected readonly id = `ui-tip-${nextId++}`;
  protected readonly hovering = signal(false);
  protected readonly focused = signal(false);
  private readonly pinned = signal(false);

  protected visible(): boolean {
    return this.hovering() || this.focused() || this.pinned();
  }

  /** A tap (or Enter / Space) pins it open; a second one closes it. */
  protected toggle(): void {
    this.pinned.update((p) => !p);
  }

  private readonly tip = viewChild<ElementRef<HTMLElement>>('tip');

  constructor() {
    // Centred on its icon, a tip near the edge of a narrow screen would run off it: shift it sideways just enough to stay 8px inside.
    afterRenderEffect(() => {
      const el = this.tip()?.nativeElement;
      if (!el) return;
      el.style.marginLeft = '0px';
      const r = el.getBoundingClientRect();
      const edge = 8;
      const shift = r.right > innerWidth - edge ? innerWidth - edge - r.right : r.left < edge ? edge - r.left : 0;
      el.style.marginLeft = `${shift}px`;
    });

    afterNextRender(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.pinned.set(false);
          this.hovering.set(false);
          this.focused.set(false);
        }
      };
      const onDown = (e: Event) => {
        if (!this.host.nativeElement.contains(e.target as Node)) this.pinned.set(false);
      };
      document.addEventListener('keydown', onKey);
      document.addEventListener('pointerdown', onDown);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('pointerdown', onDown);
      });
    });
  }
}
