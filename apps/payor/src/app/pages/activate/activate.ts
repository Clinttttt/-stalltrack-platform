import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/**
 * First sign-in, with the one-time code the office issued.
 *
 * The same endpoint sets the payor's own password and signs them in, so a successful activation lands on their accounts
 * rather than sending them back to a sign-in screen with credentials they have only just created.
 */
@Component({
  selector: 'app-activate',
  imports: [FormsModule, RouterLink],
  templateUrl: './activate.html',
})
export class Activate {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  fullName = '';
  activationCode = '';
  contactNumber = '';
  password = '';

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly revealed = signal(false);

  /** The office refuses a short password, so the button does not invite one. */
  protected readonly ready = computed(
    () =>
      this.fullName.trim().length > 0 &&
      this.activationCode.trim().length > 0 &&
      this.contactNumber.trim().length > 0 &&
      this.password.length >= 8,
  );

  protected reveal(): void {
    this.revealed.update((shown) => !shown);
  }

  protected async submit(): Promise<void> {
    if (this.busy() || !this.ready()) return;

    this.busy.set(true);
    this.error.set(null);

    const failure = await this.auth.activate(
      this.activationCode.trim(),
      this.contactNumber.trim(),
      this.fullName.trim(),
      this.password,
    );

    this.busy.set(false);

    if (failure) {
      this.error.set(failure);
      return;
    }

    await this.router.navigate(['/']);
  }
}
