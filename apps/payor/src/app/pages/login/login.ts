import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/**
 * Sign-in for a stallholder or vendor.
 *
 * Mobile number and password, because that is what the office issues and what a payor remembers. Nothing about the
 * session is kept here: the API answers with cookies the browser holds and no script can read.
 */
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <main class="p-shell justify-center px-6">
      <p class="text-[11px] font-bold uppercase leading-none tracking-[0.18em] text-gold">StallTrack</p>
      <h1 class="mt-3 font-display text-2xl text-navy">Payor Portal</h1>
      <p class="mt-2 text-sm text-muted">Sign in to view your own account and balances.</p>

      <form class="mt-8 flex flex-col gap-4" (ngSubmit)="submit()">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold uppercase tracking-wide text-muted">Mobile number</span>
          <input
            class="rounded-xl border border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-navy"
            type="tel"
            inputmode="tel"
            autocomplete="username"
            placeholder="09XXXXXXXXX"
            name="contactNumber"
            [(ngModel)]="contactNumber"
            [disabled]="busy()"
          />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold uppercase tracking-wide text-muted">Password</span>
          <input
            class="rounded-xl border border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-navy"
            type="password"
            autocomplete="current-password"
            name="password"
            [(ngModel)]="password"
            [disabled]="busy()"
          />
        </label>

        @if (error()) {
          <p class="rounded-xl bg-red-bg px-4 py-3 text-sm text-red">{{ error() }}</p>
        }

        <button
          class="mt-2 rounded-xl bg-navy px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50"
          type="submit"
          [disabled]="busy() || !contactNumber || !password"
        >
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="mt-8 text-xs leading-relaxed text-muted">
        Your Official Receipt is issued by the office that collects your fees. If you have no account yet, ask that
        office for your activation code.
      </p>
    </main>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  contactNumber = '';
  password = '';

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
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
