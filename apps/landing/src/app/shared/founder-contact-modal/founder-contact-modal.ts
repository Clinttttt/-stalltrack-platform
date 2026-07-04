import { Component, DestroyRef, afterNextRender, inject, output, signal } from '@angular/core';

/**
 * Faithful Angular port of the React <FounderContactModal>. A native formsubmit.co form that mails
 * the founder. Locks body scroll while open, closes on Escape / backdrop click. The React `onClose`
 * prop becomes the `close` output.
 */
@Component({
  selector: 'app-founder-contact-modal',
  standalone: true,
  templateUrl: './founder-contact-modal.html',
})
export class FounderContactModal {
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
