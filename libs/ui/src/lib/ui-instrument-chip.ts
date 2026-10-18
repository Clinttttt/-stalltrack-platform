import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * The accountable-instrument marker: OR (Official Receipt) or CT (Cash Ticket). Copy of the Head Portal's InstrumentChip.
 *
 * The letters and the spoken name carry the meaning; the tint only groups them (OR gold-tinted, CT neutral). The instrument always
 * comes from the page's data or approved policy - this component never decides it.
 */
@Component({
  selector: 'ui-instrument-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-1.5 align-middle' },
  template: `
    <span [class]="codeClass()" aria-hidden="true">{{ instrument() }}</span>
    @if (showName()) {
      <span class="text-[0.8125rem] font-medium" aria-hidden="true">{{ name() }}</span>
    }
    <span class="sr-only">{{ context() ? context() + ': ' + name() : name() }}</span>
  `,
})
export class UiInstrumentChip {
  /** "OR" or "CT". */
  readonly instrument = input.required<'OR' | 'CT'>();
  /** Show the full name beside the code. */
  readonly showName = input(false);
  /** Optional business context read before the name, for screen readers ("Whole payment"). */
  readonly context = input('');

  protected readonly name = computed(() => (this.instrument() === 'OR' ? 'Official Receipt' : 'Cash Ticket'));
  protected readonly codeClass = computed(
    () =>
      'inline-flex h-[22px] min-w-[30px] items-center justify-center whitespace-nowrap rounded border px-1.5 text-[0.6875rem] font-semibold leading-none tracking-[0.04em] text-ink ' +
      (this.instrument() === 'OR'
        ? 'border-[color-mix(in_srgb,#c8a84b_55%,#dde3ea)] bg-[color-mix(in_srgb,#c8a84b_9%,white)]'
        : 'border-line bg-white'),
  );
}
