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
 * The AdminLayout (which provides the shared DemoStore) wraps the three console pages
 * as child routes, mirroring the React <Route element={<AdminLayout />}> nesting.
 */
export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
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
