import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The placeholder block: skeleton gray with a soft left-to-right shimmer; the shimmer stops under prefers-reduced-motion. */
const BLOCK =
  'block rounded-lg bg-skeleton bg-[length:200%_100%] bg-no-repeat bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.9),rgba(255,255,255,0))] animate-ui-shimmer motion-reduce:animate-none';

/**
 * A skeleton shaped like the content that is coming, so the page does not jump when the data arrives.
 *
 *   @if (loading()) { <ui-skeleton variant="table" [rows]="5" /> } @else { ...the table... }
 *
 * Variants: `bar` (one line), `lines` (a paragraph), `hero` (the page hero), `cards` (a row of cards), `table` (header + rows),
 * `list` (avatar-less list rows). It announces "Loading" once, politely; never use bare "Loading…" text instead.
 */
@Component({
  selector: 'ui-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', role: 'status', 'aria-live': 'polite' },
  template: `
    <span class="sr-only">{{ label() }}</span>
    @switch (variant()) {
      @case ('hero') {
        <div class="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl bg-civic-panel/90 px-6 py-[18px]" aria-hidden="true">
          <div class="flex min-w-0 flex-[1_1_16rem] items-center gap-4">
            <span class="h-12 w-12 shrink-0 rounded-[10px] bg-white/15"></span>
            <div class="grid flex-1 gap-2">
              <span class="h-3 w-28 rounded bg-white/25"></span>
              <span class="h-5 w-3/5 rounded bg-white/30"></span>
              <span class="h-3 w-2/5 rounded bg-white/20"></span>
            </div>
          </div>
          <div class="flex gap-6">
            @for (n of [0, 1, 2]; track n) {
              <div class="grid gap-2"><span class="h-5 w-20 rounded bg-white/30"></span><span class="h-3 w-14 rounded bg-white/20"></span></div>
            }
          </div>
        </div>
      }
      @case ('cards') {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          @for (n of count(); track n) {
            <div class="rounded-xl border border-line bg-white p-5">
              <span [class]="block + ' h-5 w-1/2'"></span>
              <span [class]="block + ' mt-3 h-3 w-full'"></span>
              <span [class]="block + ' mt-2 h-3 w-4/5'"></span>
            </div>
          }
        </div>
      }
      @case ('table') {
        <div class="overflow-hidden rounded-xl border border-line bg-white" aria-hidden="true">
          <div class="flex gap-4 border-b border-line bg-mist px-4 py-3">
            @for (n of [0, 1, 2, 3]; track n) {
              <span [class]="block + ' h-3 flex-1'"></span>
            }
          </div>
          @for (n of count(); track n) {
            <div class="flex gap-4 border-b border-line px-4 py-4 last:border-b-0">
              @for (c of [0, 1, 2, 3]; track c) {
                <span [class]="block + ' h-4 flex-1'"></span>
              }
            </div>
          }
        </div>
      }
      @case ('list') {
        <div class="grid gap-3" aria-hidden="true">
          @for (n of count(); track n) {
            <div class="grid gap-2 rounded-lg border border-line bg-white px-4 py-3">
              <span [class]="block + ' h-4 w-2/5'"></span>
              <span [class]="block + ' h-3 w-3/5'"></span>
            </div>
          }
        </div>
      }
      @case ('lines') {
        <div class="grid gap-2.5" aria-hidden="true">
          @for (n of count(); track n; let last = $last) {
            <span [class]="block + ' h-3 ' + (last ? 'w-3/5' : 'w-full')"></span>
          }
        </div>
      }
      @default {
        <span [class]="block + ' h-4 w-full'" aria-hidden="true"></span>
      }
    }
  `,
})
export class UiSkeleton {
  readonly variant = input<'bar' | 'lines' | 'hero' | 'cards' | 'table' | 'list'>('bar');
  /** Rows / cards / lines, where the variant has them. */
  readonly rows = input(4);
  readonly label = input('Loading');

  protected readonly block = BLOCK;
  protected readonly count = computed(() => Array.from({ length: Math.max(1, this.rows()) }, (_, i) => i));
}
