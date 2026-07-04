import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

type SelectOption = string | { value: string; label: string };

/**
 * Control-only polished dropdown — a styled replacement for the native <select> so the OPEN list
 * matches the design system. Faithful Angular port of the React <PolishedSelect>.
 *
 * The React version renders the menu via a portal into document.body to escape overflow clipping.
 * Angular has no createPortal without CDK, so the menu is rendered inline with `position: fixed`
 * (viewport-anchored coords computed the same way) — visually and functionally identical.
 */
@Component({
  selector: 'app-polished-select',
  standalone: true,
  templateUrl: './polished-select.html',
})
export class PolishedSelect {
  private readonly destroyRef = inject(DestroyRef);

  readonly options = input.required<ReadonlyArray<SelectOption>>();
  readonly value = input<string>('');
  readonly placeholder = input('Select…');
  readonly className = input('');

  /** Mirrors the React `onChange(value)` prop. */
  readonly valueChange = output<string>();

  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  readonly open = signal(false);
  readonly pos = signal<Record<string, string> | null>(null);

  readonly opts = computed(() =>
    this.options().map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
  );
  readonly selectedLabel = computed(() => this.opts().find((o) => o.value === this.value())?.label);

  constructor() {
    afterNextRender(() => {
      const onDown = (e: MouseEvent) => {
        if (!this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
      };
      const reposition = () => {
        if (this.open()) this.updatePos();
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.open.set(false);
      };

      document.addEventListener('mousedown', onDown);
      window.addEventListener('resize', reposition);
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('keydown', onKey);

      this.destroyRef.onDestroy(() => {
        document.removeEventListener('mousedown', onDown);
        window.removeEventListener('resize', reposition);
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('keydown', onKey);
      });
    });
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  updatePos(): void {
    const trigger = this.triggerRef()?.nativeElement;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const edge = 12;
    const below = window.innerHeight - rect.bottom - gap - edge;
    const above = rect.top - gap - edge;
    const openUp = below < 240 && above > below;
    const space = openUp ? above : below;

    const style: Record<string, string> = {
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.max(140, Math.min(300, space))}px`,
    };
    if (openUp) style['bottom'] = `${window.innerHeight - rect.top + gap}px`;
    else style['top'] = `${rect.bottom + gap}px`;
    this.pos.set(style);
  }

  toggle(): void {
    if (!this.open()) this.updatePos();
    this.open.update((s) => !s);
  }

  select(value: string): void {
    this.valueChange.emit(value);
    this.open.set(false);
  }
}
