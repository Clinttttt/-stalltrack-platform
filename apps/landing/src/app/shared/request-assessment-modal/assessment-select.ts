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
 * Faithful Angular port of the internal <PolishedSelect> from the React RequestAssessmentModal.
 * A fully-styled dropdown with label, required marker, error state, and an optional hidden input
 * (so the surrounding native form submits the selected value). Rendered inline with fixed
 * positioning (equivalent to the React portal — no CDK dependency).
 */
@Component({
  selector: 'app-assessment-select',
  standalone: true,
  templateUrl: './assessment-select.html',
})
export class AssessmentSelect {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  readonly label = input('');
  readonly required = input(false);
  readonly placeholder = input('Select an option');
  readonly options = input.required<ReadonlyArray<SelectOption>>();
  readonly value = input<string>('');
  readonly error = input<string | undefined>(undefined);
  readonly name = input<string | undefined>(undefined);

  /** Mirrors the React `onChange(value)` prop. */
  readonly valueChange = output<string>();

  readonly open = signal(false);
  readonly pos = signal<Record<string, string> | null>(null);

  readonly opts = computed(() =>
    this.options().map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
  );
  readonly selectedLabel = computed(() => this.opts().find((o) => o.value === this.value())?.label);

  constructor() {
    afterNextRender(() => {
      const onDown = (event: MouseEvent) => {
        if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
      };
      const reposition = () => {
        if (this.open()) this.updatePos();
      };
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') this.open.set(false);
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

  updatePos(): void {
    const trigger = this.triggerRef()?.nativeElement;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const edge = 16;
    const below = window.innerHeight - rect.bottom - gap - edge;
    const above = rect.top - gap - edge;
    const openUp = below < 260 && above > below;
    const space = openUp ? above : below;

    const style: Record<string, string> = {
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.max(140, Math.min(320, space))}px`,
    };
    if (openUp) style['bottom'] = `${window.innerHeight - rect.top + gap}px`;
    else style['top'] = `${rect.bottom + gap}px`;
    this.pos.set(style);
  }

  toggle(): void {
    if (!this.open()) this.updatePos();
    this.open.update((state) => !state);
  }

  select(value: string): void {
    this.valueChange.emit(value);
    this.open.set(false);
  }
}
