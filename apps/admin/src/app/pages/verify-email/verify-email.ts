import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PasswordRecoveryService } from '../../core/password-recovery.service';
import { AuthShell } from '../../shared/auth-shell/auth-shell';
import { Icon } from '../../shared/icon/icon';

/**
 * Public one-time email confirmation for the Platform Operator.
 * Email scanners may follow links, so only an explicit click submits the token.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, AuthShell, Icon],
  templateUrl: './verify-email.html',
})
export class VerifyEmail {
  private readonly recovery = inject(PasswordRecoveryService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  readonly hasToken = this.token.length > 0;
  readonly busy = signal(false);
  readonly confirmed = signal(false);
  readonly error = signal('');

  constructor() {
    this.title.setTitle('Confirm email - StallTrack Admin');
  }

  async confirm(): Promise<void> {
    if (!this.hasToken || this.busy() || this.confirmed()) return;
    this.error.set('');
    this.busy.set(true);
    try {
      const result = await this.recovery.verifyEmail(this.token);
      if (result.ok) {
        this.confirmed.set(true);
      } else {
        this.error.set(result.error || 'We could not confirm this email. Please try again.');
      }
    } catch {
      this.error.set('Cannot reach the server. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
