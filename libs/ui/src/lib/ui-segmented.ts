import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, input, model, viewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

export interface UiSegment {
  value: string;
  label: string;
  /** A quiet count beside the label. */
  count?: number;
}

/**
 * The view switch: one table or list on screen, the alternatives behind this toggle (instead of several tables down a page).
 *
 *   <ui-segmented [options]="views" [(value)]="view" ariaLabel="Show" queryParam="view" />
 *
 * Two to four options; more is a dropdown. Left/Right/Home/End move and select. With `queryParam` the selection lives in the URL
 * (`?view=...`), so a reload and the Back button behave. The panel below the toggle is the caller's: give it `animate-ui-rise`.
 */
@Component({
  selector: 'ui-segmented',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex max-w-full' },
  template: `
    <div role="tablist" [attr.aria-label]="ariaLabel()" class="inline-flex max-w-full gap-1 overflow-x-auto rounded-[10px] bg-mist p-1">
      @for (o of options(); track o.value; let i = $index) {
        <button
          #seg
          type="button"
          role="tab"
          class="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-all duration-150"
          [class]="o.value === value() ? 'bg-white text-civic shadow-soft ring-1 ring-line' : 'text-muted hover:bg-white/60 hover:text-ink'"
          [attr.aria-selected]="o.value === value()"
          [attr.tabindex]="o.value === value() ? 0 : -1"
          (click)="select(o.value)"
          (keydown)="onKey($event, i)"
        >
          {{ o.label }}
          @if (o.count !== undefined) {
            <span class="text-xs font-medium tabular-nums opacity-75">{{ o.count }}</span>
          }
        </button>
      }
    </div>
  `,
})
export class UiSegmented {
  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly segs = viewChildren<ElementRef<HTMLButtonElement>>('seg');

  readonly options = input.required<ReadonlyArray<UiSegment>>();
  readonly value = model.required<string>();
  readonly ariaLabel = input('View');
  /** Keep the selection in this URL query parameter. */
  readonly queryParam = input('');

  constructor() {
    afterNextRender(() => {
      const param = this.queryParam();
      const fromUrl = param ? this.route?.snapshot.queryParamMap.get(param) : null;
      if (fromUrl && this.options().some((o) => o.value === fromUrl)) this.value.set(fromUrl);
    });
  }

  protected select(value: string): void {
    if (value === this.value()) return;
    this.value.set(value);
    const param = this.queryParam();
    if (param && this.router) {
      void this.router.navigate([], { queryParams: { [param]: value }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  protected onKey(event: KeyboardEvent, index: number): void {
    const last = this.options().length - 1;
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : -1;
    if (next < 0) return;
    event.preventDefault();
    this.select(this.options()[next].value);
    queueMicrotask(() => this.segs()[next]?.nativeElement.focus());
  }
}
