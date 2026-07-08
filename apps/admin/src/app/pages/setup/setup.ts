import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Icon } from '../../shared/icon/icon';
import { PlatformSetupService } from '../../core/platform-setup.service';

/**
 * First-run setup for the platform/console operator. Shown only when no operator exists yet (checked on
 * load); once one exists this redirects to sign-in, so it can never be used as a public back door.
 */
@Component({
  selector: 'app-console-setup',
  standalone: true,
  imports: [FormsModule, Icon],
  templateUrl: './setup.html',
})
export class ConsoleSetup {
  private readonly setup = inject(PlatformSetupService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  fullName = '';
  username = '';
  email = '';
  password = '';
  confirm = '';

  readonly checking = signal(true);
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly error = signal('');

  constructor() {
    this.title.setTitle('First-run setup — StallTrack Admin');
    void this.check();
  }

  private async check(): Promise<void> {
    const required = await this.setup.isSetupRequired();
    this.checking.set(false);
    if (!required) this.router.navigate(['/login'], { replaceUrl: true });
  }

  async submit(): Promise<void> {
    this.error.set('');
    if (!this.fullName.trim() || !this.username.trim() || !this.email.trim() || !this.password) {
      this.error.set('Please complete all fields.');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    if (this.password !== this.confirm) {
      this.error.set('Passwords do not match.');
      return;
    }
    this.busy.set(true);
    const res = await this.setup.createFirstOperator({
      fullName: this.fullName.trim(),
      username: this.username.trim(),
      email: this.email.trim(),
      password: this.password,
    });
    this.busy.set(false);
    if (res.ok) this.done.set(true);
    else this.error.set(res.error);
  }

  goToLogin(): void {
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
