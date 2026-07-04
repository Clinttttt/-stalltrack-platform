import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Icon } from '../../shared/icon/icon';
import { AuthService } from '../../core/auth.service';

/**
 * Faithful Angular port of the React apps/admin/src/pages/Login.jsx.
 * Split brand/form panel. Mock sign-in with simulated latency; on success routes to the
 * attempted path (`from` query param, default '/'). Real auth is enforced by the API.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, Icon],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  private readonly from = this.route.snapshot.queryParamMap.get('from') || '/';

  username = '';
  password = '';
  readonly error = signal('');
  readonly busy = signal(false);

  constructor() {
    this.title.setTitle('Sign in — StallTrack Admin');
    if (this.auth.isAuthenticated()) this.router.navigate(['/'], { replaceUrl: true });
  }

  submit(): void {
    this.error.set('');
    this.busy.set(true);
    // Mock latency so the demo feels like a real sign-in.
    setTimeout(() => {
      const res = this.auth.login(this.username, this.password);
      this.busy.set(false);
      if (res.ok) this.router.navigateByUrl(this.from, { replaceUrl: true });
      else this.error.set(res.error || 'Unable to sign in.');
    }, 450);
  }
}
