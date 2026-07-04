import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Faithful Angular port of the React apps/admin/src/components/ProtectedRoute.jsx.
 * When not authenticated, redirects to /login and remembers the attempted path (as a
 * `from` query param, mirroring React Router's `state.from`).
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { from: state.url } });
  }
  return true;
};
