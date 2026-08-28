import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Icon } from '../../shared/icon/icon';
import { AuthService } from '../../core/auth.service';
import { PlatformSetupService } from '../../core/platform-setup.service';

/**
 * Sign-in for the platform operator. Split brand/form panel; authorization is enforced by the API, which
 * admits the dedicated operator account only.
 *
 * When the platform has NO operator yet there is nobody who can sign in, so this page sends the visitor to
 * /setup to create the first one. Without that check the console offered a sign-in form and nothing else -
 * the operator account had been deleted, the API was reporting isSetupRequired, and the only way to reach
 * the form that fixes it was to know the /setup address by heart.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, Icon, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly setup = inject(PlatformSetupService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  private readonly from = this.route.snapshot.queryParamMap.get('from') || '/';

  username = '';
  password = '';
  readonly error = signal('');
  readonly busy = signal(false);

  constructor() {
    this.title.setTitle('Sign in - StallTrack Admin');
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/'], { replaceUrl: true });
      return;
    }

    // Fail-safe by design: isSetupRequired() answers false if the check itself fails, so a network blip leaves
    // the sign-in form exactly as it is rather than sending anyone to a bootstrap screen.
    void this.setup.isSetupRequired().then((required) => {
      if (required) this.router.navigate(['/setup'], { replaceUrl: true });
    });
  }

  submit(): void {
    this.error.set('');
    this.busy.set(true);
    this.auth
      .login(this.username, this.password)
      .then((res) => {
        this.busy.set(false);
        if (res.ok) this.router.navigateByUrl(this.from, { replaceUrl: true });
        else this.error.set(res.error || 'Unable to sign in.');
      })
      .catch(() => {
        this.busy.set(false);
        this.error.set('Unable to sign in. Please try again.');
      });
  }
}
