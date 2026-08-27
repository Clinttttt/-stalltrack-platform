import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/**
 * Sign-in for a stallholder or vendor.
 *
 * Mobile number and password, because that is what the office issues and what a payor remembers. Nothing about the
 * session is kept here: the API answers with cookies the browser holds and no script can read.
 */
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  contactNumber = '';
  password = '';

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly revealed = signal(false);

  protected reveal(): void {
    this.revealed.update((shown) => !shown);
  }

  protected async submit(): Promise<void> {
    if (this.busy()) return;

    this.busy.set(true);
    this.error.set(null);

    const failure = await this.auth.login(this.contactNumber.trim(), this.password);

    this.busy.set(false);

    if (failure) {
      this.error.set(failure);
      return;
    }

    await this.router.navigate(['/']);
  }
}
