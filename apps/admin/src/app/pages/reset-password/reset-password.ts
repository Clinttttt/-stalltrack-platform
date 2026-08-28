import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Icon } from '../../shared/icon/icon';
import { AuthShell } from '../../shared/auth-shell/auth-shell';
import { PasswordRecoveryService } from '../../core/password-recovery.service';

/**
 * Sets a new password from the one-time link in the operator's email.
 *
 * The token is read from the address and never shown. Which account it belongs to is asked of the API before the form is
 * offered, so the operator can see WHOSE password they are about to set: a link opened from an old email would otherwise
 * silently change a different account's password than the one they meant.
 *
 * The API decides whether a password is acceptable and whether the token is still good — it is single-use, expires in
 * thirty minutes, and issuing a new one retires the last. This screen states its answer rather than second-guessing it,
 * except for a length it can check before troubling the server.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, Icon, AuthShell],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly recovery = inject(PasswordRecoveryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  password = '';
  confirm = '';

  readonly checking = signal(true);
  /** The account the link belongs to. Null once checked means the link is unknown, used or expired. */
  readonly account = signal<{ username: string; fullName: string | null } | null>(null);
  readonly error = signal('');
  readonly done = signal(false);
  readonly busy = signal(false);

  constructor() {
    this.title.setTitle('Set a new password - StallTrack Admin');

    void this.recovery.context(this.token).then((account) => {
      this.account.set(account);
      this.checking.set(false);
    });
  }

  submit(): void {
    if (this.busy()) return;

    this.error.set('');

    // Checked here only because it costs the operator a round trip to be told otherwise, and because the two boxes
    // disagreeing is nothing the server can see. Everything else the API rules on.
    if (this.password.length < 8) {
      this.error.set('Use at least eight characters.');
      return;
    }
    if (this.password !== this.confirm) {
      this.error.set('The two passwords do not match.');
      return;
    }

    this.busy.set(true);
    void this.recovery.reset(this.token, this.password).then((res) => {
      this.busy.set(false);
      if (res.ok) {
        this.done.set(true);
        return;
      }
      this.error.set(res.error || 'That password could not be set.');
    });
  }

  toSignIn(): void {
    void this.router.navigate(['/login'], { replaceUrl: true });
  }
}
