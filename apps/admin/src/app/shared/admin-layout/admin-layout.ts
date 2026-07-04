import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../icon/icon';
import { AuthService } from '../../core/auth.service';
import { DemoStore } from '../../core/demo-store.service';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { to: '/onboarding', label: 'LGU Onboarding', icon: 'layers' },
  { to: '/validation', label: 'Validation', icon: 'activity' },
  { to: '/activation', label: 'Activation', icon: 'power' },
];

/**
 * Faithful Angular port of the React apps/admin/src/components/AdminLayout.jsx.
 * Sidebar + top bar shell wrapping the routed console pages. Provides the DemoStore at
 * this level so the three pages share one working set (mirrors the React provider that
 * wrapped the routed <Outlet />).
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  providers: [DemoStore],
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly nav = NAV;
  readonly user = this.auth.currentUser();

  signOut(): void {
    this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
