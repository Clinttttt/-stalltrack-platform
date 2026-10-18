import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiIcon } from './ui-icon';

/**
 * An empty view: an icon in a tile, one line, and (optionally) one action. No paragraph.
 *
 *   <ui-empty-state icon="inbox" text="No requests in this view."> <button class="a-btn-ghost">Refresh</button> </ui-empty-state>
 */
@Component({
  selector: 'ui-empty-state',
  standalone: true,
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex animate-ui-rise flex-col items-center justify-center gap-3 px-4 py-12 text-center' },
  template: `
    <span class="grid h-12 w-12 place-items-center rounded-[10px] bg-civic-soft text-civic" aria-hidden="true">
      <ui-icon [name]="icon()" className="h-6 w-6" />
    </span>
    <p class="max-w-sm text-sm text-muted">{{ text() }}</p>
    <ng-content />
  `,
})
export class UiEmptyState {
  readonly icon = input('inbox');
  readonly text = input.required<string>();
}
