import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';

/**
 * Route map mirrors the React apps/admin/src/App.jsx <Routes>:
 *   '/login'        -> Login (public)
 *   ProtectedRoute  -> AdminLayout shell:
 *     '/'           -> Console
 *     '/onboarding' -> Console
 *     '/validation' -> Validation
 *     '/activation' -> Activation
 *   '*'             -> Navigate to '/' (React `<Navigate to="/" replace />`)
 *
 * The AdminLayout wraps the three console pages as child routes, mirroring the React
 * <Route element={<AdminLayout />}> nesting.
 */
export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'setup',
    loadComponent: () => import('./pages/setup/setup').then((m) => m.ConsoleSetup),
  },
  // Public by necessity: somebody who cannot sign in is the only person who needs these. The API's own endpoints are
  // anonymous and rate-limited for the same reason, and answer identically for an address they have never seen.
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password/:token',
    loadComponent: () => import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', loadComponent: () => import('./pages/console/console').then((m) => m.Console) },
      { path: 'onboarding', loadComponent: () => import('./pages/console/console').then((m) => m.Console) },
      { path: 'validation', loadComponent: () => import('./pages/validation/validation').then((m) => m.Validation) },
      { path: 'activation', loadComponent: () => import('./pages/activation/activation').then((m) => m.Activation) },
    ],
  },
  { path: '**', redirectTo: '' },
];
