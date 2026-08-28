import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Icon } from '../../shared/icon/icon';
import { AuthShell } from '../../shared/auth-shell/auth-shell';
import { PasswordRecoveryService } from '../../core/password-recovery.service';

/**
 * Asks for a reset link when the operator cannot sign in.
 *
 * The operator is the one account with nobody above it to restore its access: every municipal Head can be reset by the
 * platform, and the platform's own operator could only ever be reset in the database by hand. This is the way back.
 *
 * What it says on success says nothing about the address. The API answers identically for an address it has never seen,
 * and so does this screen, because naming which addresses hold an operator account tells a stranger where to aim.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, Icon, AuthShell],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly recovery = inject(PasswordRecoveryService);
  private readonly title = inject(Title);

  email = '';
  readonly error = signal('');
  readonly sent = signal(false);
  readonly busy = signal(false);

  constructor() {
    this.title.setTitle('Reset your password - StallTrack Admin');
  }

  submit(): void {
    if (this.busy()) return;

    this.error.set('');
    this.busy.set(true);

    void this.recovery.request(this.email).then((res) => {
      this.busy.set(false);
      if (res.ok) this.sent.set(true);
      else this.error.set(res.error || 'That request could not be sent just now.');
    });
  }
}
