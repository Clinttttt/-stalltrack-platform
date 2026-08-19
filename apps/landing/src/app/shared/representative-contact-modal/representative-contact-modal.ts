import { Component, DestroyRef, afterNextRender, inject, output, signal } from '@angular/core';

/**
 * Direct-message form for the project representative. A native formsubmit.co form that mails the
 * project inbox. Locks body scroll while open and closes on Escape / backdrop click; the host page
 * listens to the `close` output.
 */
@Component({
  selector: 'app-representative-contact-modal',
  standalone: true,
  templateUrl: './representative-contact-modal.html',
})
export class RepresentativeContactModal {
  private readonly destroyRef = inject(DestroyRef);

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
