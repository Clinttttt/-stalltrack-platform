import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiIcon } from './ui-icon';

/**
 * The page hero: one solid civic-panel band that opens every operator page (copy of the Head Portal's V3Hero).
 *
 *   <ui-hero eyebrow="Operations · ECF" title="Electricity Consumption Fees" icon="zap">
 *     <ng-container meta>October 2026 · <ui-instrument-chip instrument="OR" /> Official Receipt</ng-container>
 *     <ui-hero-figure value="₱0.00" label="Assessed" note="Approved amounts" />
 *   </ui-hero>
 *
 * The title is the page's only <h1>. The eyebrow is the only upper-case text on a page. Up to three figures; they wrap under the
 * identity on narrow screens.
 */
@Component({
  selector: 'ui-hero',
  standalone: true,
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="flex flex-wrap items-center rounded-xl bg-civic-panel text-white"
      [class]="compact() ? 'mb-4 gap-x-8 gap-y-3 px-5 py-3.5' : 'mb-5 gap-x-8 gap-y-4 px-6 py-[18px]'"
    >
      <div class="flex min-w-0 flex-[1_1_16rem] items-center gap-4">
        @if (icon(); as name) {
          <span
            class="grid shrink-0 place-items-center rounded-[10px] border border-white/20 bg-white/10"
            [class]="compact() ? 'h-10 w-10' : 'h-12 w-12'"
            aria-hidden="true"
          >
            <ui-icon [name]="name" className="h-[22px] w-[22px]" />
          </span>
        }
        <div class="min-w-0">
          @if (eyebrow()) {
            <p class="mb-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-white/80">{{ eyebrow() }}</p>
          }
          <h1 class="text-[1.375rem] font-bold leading-tight outline-none" tabindex="-1">{{ title() }}</h1>
          <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-white/90 empty:hidden"><ng-content select="[meta]" /></p>
        </div>
      </div>
      <div class="flex flex-wrap items-stretch gap-y-3 empty:hidden">
        <ng-content select="ui-hero-figure" />
      </div>
    </section>
  `,
})
export class UiHero {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  /** A name from the shared icon set; omit for no tile. */
  readonly icon = input('');
  readonly compact = input(false);
}

/** One figure on the hero: the value first in weight, the label and the one-line note quieter. */
@Component({
  selector: 'ui-hero-figure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block border-l border-white/25 px-6 first:border-l-0 first:pl-0 last:pr-0 max-sm:border-l-0 max-sm:px-0 max-sm:pr-6' },
  template: `
    <p class="whitespace-nowrap text-[1.375rem] font-bold leading-[1.15] tabular-nums max-xl:text-lg">{{ value() }}</p>
    <p class="mt-0.5 text-xs font-medium text-white/90">{{ label() }}</p>
    @if (note()) {
      <p class="mt-0.5 text-[0.6875rem] text-white/80">{{ note() }}</p>
    }
  `,
})
export class UiHeroFigure {
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly note = input('');
}
