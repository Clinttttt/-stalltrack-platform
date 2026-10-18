import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface UiCrumb {
  label: string;
  /** Router link; omit on the current page. */
  link?: string | readonly string[];
}

/**
 * Breadcrumbs for anything two levels deep: `Section / Page / Detail`. The last item is the current page (not a link).
 * Sits above the hero; omit it on top-level pages.
 */
@Component({
  selector: 'ui-breadcrumb',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <nav aria-label="Breadcrumb" class="mb-3">
      <ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted">
        @for (c of items(); track $index; let last = $last) {
          <li class="flex items-center gap-2">
            @if (!last && c.link) {
              <a [routerLink]="c.link" class="rounded transition-colors duration-150 hover:text-civic hover:underline">{{ c.label }}</a>
              <span aria-hidden="true" class="text-muted/60">/</span>
            } @else {
              <span [class]="last ? 'font-semibold text-ink' : ''" [attr.aria-current]="last ? 'page' : null">{{ c.label }}</span>
              @if (!last) {
                <span aria-hidden="true" class="text-muted/60">/</span>
              }
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class UiBreadcrumb {
  readonly items = input.required<ReadonlyArray<UiCrumb>>();
}
