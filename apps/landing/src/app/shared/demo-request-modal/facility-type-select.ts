import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';

interface FacilityType {
  value: string;
  description: string;
}

/**
 * Faithful Angular port of the internal <FacilityTypeSelect> from the React DemoRequestModal.
 * A polished dropdown (with per-option descriptions) that writes into a hidden `facility_type`
 * input so the surrounding native form submits the chosen value. Rendered inline with fixed
 * positioning (equivalent to the React portal — no CDK dependency).
 */
@Component({
  selector: 'app-facility-type-select',
  standalone: true,
  templateUrl: './facility-type-select.html',
})
export class FacilityTypeSelect {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  readonly facilityTypes: ReadonlyArray<FacilityType> = [
    { value: 'Public market', description: 'Stalls, rentals, and collections' },
    { value: 'Transport terminal', description: 'Trip fees and dispatch operations' },
    { value: 'Commercial facility', description: 'Leases, tenants, and billing' },
    { value: 'Multiple facilities', description: 'Centralized multi-site operations' },
    { value: 'Other', description: 'Tell us about your facility' },
  ];

  readonly isOpen = signal(false);
  readonly selected = signal('');
  readonly menuPosition = signal<Record<string, string> | null>(null);

  constructor() {
    afterNextRender(() => {
      const closeOnOutsideClick = (event: MouseEvent) => {
        if (!this.host.nativeElement.contains(event.target as Node)) this.isOpen.set(false);
      };
      const reposition = () => {
        if (this.isOpen()) this.updateMenuPosition();
      };

      document.addEventListener('mousedown', closeOnOutsideClick);
      window.addEventListener('resize', reposition);
      window.addEventListener('scroll', reposition, true);

      this.destroyRef.onDestroy(() => {
        document.removeEventListener('mousedown', closeOnOutsideClick);
        window.removeEventListener('resize', reposition);
        window.removeEventListener('scroll', reposition, true);
      });
    });
  }

  updateMenuPosition(): void {
    const trigger = this.triggerRef()?.nativeElement;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const edgeGap = 16;
    const spaceBelow = window.innerHeight - rect.bottom - gap - edgeGap;
    const spaceAbove = rect.top - gap - edgeGap;
    const openUpward = spaceBelow < 280 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove : spaceBelow;

    const style: Record<string, string> = {
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.max(140, Math.min(360, availableSpace))}px`,
    };
    if (openUpward) style['bottom'] = `${window.innerHeight - rect.top + gap}px`;
    else style['top'] = `${rect.bottom + gap}px`;
    this.menuPosition.set(style);
  }

  toggle(): void {
    if (!this.isOpen()) this.updateMenuPosition();
    this.isOpen.update((open) => !open);
  }

  choose(value: string): void {
    this.selected.set(value);
    this.isOpen.set(false);
  }
}
