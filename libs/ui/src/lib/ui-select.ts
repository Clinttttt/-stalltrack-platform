import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, model, signal, viewChild } from '@angular/core';
import { UiIcon } from './ui-icon';

export type UiOption = string | { value: string; label: string };

let nextId = 0;

/**
 * The house dropdown, for a choice of FIVE or more. (Two to four choices are a <ui-segmented> or buttons, never a dropdown.)
 * Replaces the native select element: the open list matches the system, with a check on the current value, a flip-up when there is no room
 * below, a 150 ms entrance and a full keyboard model (arrows, Home/End, type-ahead, Enter, Esc).
 *
 *   <ui-select [options]="months" [(value)]="month" caption="Month" ariaLabel="Month" [block]="true" />
 *
 * The menu is positioned against the viewport (`fixed`), so a card or table with `overflow: hidden` cannot clip it.
 */
@Component({
  selector: 'ui-select',
  standalone: true,
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'block() ? "flex w-full" : "inline-flex"' },
  template: `
    <button
      #trigger
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      class="flex h-[42px] min-w-0 items-center justify-between gap-2.5 rounded-[10px] border-[1.5px] bg-white pl-3.5 pr-3 text-left transition-[border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50"
      [class]="(block() ? 'w-full ' : '') + (open() ? 'border-civic ring-[3px] ring-civic/15' : 'border-line hover:border-civic')"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? listId : null"
      [attr.aria-activedescendant]="open() && active() >= 0 ? optionId(active()) : null"
      (click)="toggle()"
      (keydown)="onKey($event)"
    >
      <span class="min-w-0">
        @if (caption()) {
          <span class="block text-[0.6875rem] font-medium leading-none text-muted">{{ caption() }}</span>
        }
        <span class="block truncate text-[0.8125rem] font-semibold leading-tight" [class]="selectedLabel() ? 'text-ink' : 'text-muted'">
          {{ selectedLabel() || placeholder() }}
        </span>
      </span>
      <span class="inline-flex shrink-0 text-muted transition-transform duration-200" [class.rotate-180]="open()"><ui-icon name="chevronDown" className="h-4 w-4" /></span>
    </button>

    @if (open() && pos(); as p) {
      <ul
        role="listbox"
        [id]="listId"
        class="fixed z-[300] m-0 animate-ui-pop list-none overflow-y-auto [scrollbar-color:#9aabb9_transparent] [scrollbar-width:thin] rounded-xl border-[1.5px] border-line bg-white p-1.5 shadow-card"
        [style.left]="p.left"
        [style.width]="p.width"
        [style.top]="p.top"
        [style.bottom]="p.bottom"
        [style.maxHeight]="p.maxHeight"
        tabindex="-1"
      >
        @for (o of opts(); track o.value; let i = $index) {
          <li
            role="option"
            class="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[0.8125rem] transition-colors duration-100"
            [id]="optionId(i)"
            [class]="(i === active() ? 'bg-mist ' : '') + (o.value === value() ? 'font-bold text-ink' : 'font-medium text-ink/90')"
            [attr.aria-selected]="o.value === value()"
            (mouseenter)="active.set(i)"
            (mousedown)="$event.preventDefault()"
            (click)="choose(o.value)"
          >
            <span class="min-w-0 flex-1">{{ o.label }}</span>
            @if (o.value === value()) {
              <ui-icon name="check" className="h-3.5 w-3.5 shrink-0 text-civic" />
            }
          </li>
        }
      </ul>
    }
  `,
})
export class UiSelect {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly options = input.required<ReadonlyArray<UiOption>>();
  readonly value = model('');
  readonly placeholder = input('Select…');
  /** A small label inside the trigger above the value (e.g. "Month"). */
  readonly caption = input('');
  readonly ariaLabel = input('');
  readonly block = input(false);
  readonly disabled = input(false);

  protected readonly uid = nextId++;
  protected readonly listId = `ui-select-list-${this.uid}`;
  protected readonly open = signal(false);
  protected readonly active = signal(-1);
  protected readonly pos = signal<{ left: string; width: string; top?: string; bottom?: string; maxHeight: string } | null>(null);

  protected readonly opts = computed(() => this.options().map((o) => (typeof o === 'string' ? { value: o, label: o } : o)));
  protected readonly selectedLabel = computed(() => this.opts().find((o) => o.value === this.value())?.label ?? '');

  private typed = '';
  private typedAt = 0;

  protected optionId(i: number): string {
    return `ui-select-${this.uid}-opt-${i}`;
  }

  constructor() {
    afterNextRender(() => {
      const onDown = (e: Event) => {
        if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.close(false);
      };
      const reposition = () => {
        if (this.open()) this.place();
      };
      document.addEventListener('pointerdown', onDown);
      window.addEventListener('resize', reposition);
      window.addEventListener('scroll', reposition, true);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('pointerdown', onDown);
        window.removeEventListener('resize', reposition);
        window.removeEventListener('scroll', reposition, true);
      });
    });
  }

  private place(): void {
    const rect = this.trigger().nativeElement.getBoundingClientRect();
    const gap = 6;
    const edge = 12;
    const below = window.innerHeight - rect.bottom - gap - edge;
    const above = rect.top - gap - edge;
    const up = below < 240 && above > below;
    const room = up ? above : below;
    this.pos.set({
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, 180)}px`,
      maxHeight: `${Math.max(140, Math.min(320, room))}px`,
      ...(up ? { bottom: `${window.innerHeight - rect.top + gap}px` } : { top: `${rect.bottom + gap}px` }),
    });
  }

  protected toggle(): void {
    if (this.open()) this.close(true);
    else this.openMenu();
  }

  private openMenu(): void {
    if (this.disabled()) return;
    this.place();
    this.active.set(Math.max(0, this.opts().findIndex((o) => o.value === this.value())));
    this.open.set(true);
    this.reveal();
  }

  private close(refocus: boolean): void {
    this.open.set(false);
    if (refocus) this.trigger().nativeElement.focus();
  }

  /** Keeps the active option inside the visible part of the list (after the menu has rendered). */
  private reveal(): void {
    queueMicrotask(() => requestAnimationFrame(() => document.getElementById(this.optionId(this.active()))?.scrollIntoView?.({ block: 'nearest' })));
  }

  protected choose(value: string): void {
    this.value.set(value);
    this.close(true);
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.opts().length;
    if (n === 0) return;
    const move = (to: number) => {
      e.preventDefault();
      if (!this.open()) this.openMenu();
      this.active.set(Math.min(n - 1, Math.max(0, to)));
      this.reveal();
    };
    switch (e.key) {
      case 'ArrowDown': return move(this.open() ? this.active() + 1 : this.active());
      case 'ArrowUp': return move(this.open() ? this.active() - 1 : this.active());
      case 'Home': return move(0);
      case 'End': return move(n - 1);
      case 'Escape':
        if (this.open()) { e.preventDefault(); this.close(true); }
        return;
      case 'Tab':
        if (this.open()) this.close(false);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!this.open()) this.openMenu();
        else if (this.active() >= 0) this.choose(this.opts()[this.active()].value);
        return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) this.typeAhead(e.key);
    }
  }

  /** Typing jumps to the next option that starts with what was typed (the buffer resets after a second). */
  private typeAhead(ch: string): void {
    const now = Date.now();
    this.typed = now - this.typedAt > 1000 ? ch.toLowerCase() : this.typed + ch.toLowerCase();
    this.typedAt = now;
    const i = this.opts().findIndex((o) => o.label.toLowerCase().startsWith(this.typed));
    if (i < 0) return;
    if (!this.open()) this.openMenu();
    this.active.set(i);
    this.reveal();
  }
}
