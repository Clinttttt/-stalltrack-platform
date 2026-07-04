import { Component, DestroyRef, afterNextRender, inject, output, signal } from '@angular/core';
import { FacilityTypeSelect } from './facility-type-select';

/**
 * Faithful Angular port of the React <DemoRequestModal>. A native formsubmit.co product-inquiry form
 * with a polished facility-type dropdown. Locks body scroll while open, closes on Escape / backdrop
 * click. The React `onClose` prop becomes the `close` output.
 */
@Component({
  selector: 'app-demo-request-modal',
  standalone: true,
  imports: [FacilityTypeSelect],
  templateUrl: './demo-request-modal.html',
})
export class DemoRequestModal {
  private readonly destroyRef = inject(DestroyRef);

  /** Mirrors the React `onClose` prop. */
  readonly close = output<void>();

  readonly confirmationUrl = signal('');

  constructor() {
    afterNextRender(() => {
      this.confirmationUrl.set(`${window.location.origin}/thanks`);

      const previousOverflow = document.body.style.overflow;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') this.close.emit();
      };

      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);

      this.destroyRef.onDestroy(() => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', onKeyDown);
      });
    });
  }
}
