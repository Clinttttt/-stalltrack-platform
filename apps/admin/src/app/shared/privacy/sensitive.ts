import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * One sensitive value. Shown as-is when `revealed`; otherwise it is replaced by a blurred placeholder of similar width.
 *
 * The placeholder is built from the value's LENGTH only (never its characters), and the real text is not rendered while hidden,
 * so selecting, copying or inspecting the hidden value does not produce it. A screen reader announces "Hidden", not the number.
 */
@Component({
  selector: 'app-sensitive',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (revealed()) {
      <span>{{ value() }}</span>
    } @else {
      <span class="a-masked" role="img" aria-label="Hidden. Reveal details to view.">{{ placeholder() }}</span>
    }
  `,
})
export class Sensitive {
  readonly value = input<string>('');
  readonly revealed = input<boolean>(false);

  protected readonly placeholder = computed(() => '•'.repeat(Math.min(Math.max((this.value() ?? '').length, 4), 10)));
}
