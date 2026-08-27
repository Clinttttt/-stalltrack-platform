import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';

/**
 * The portal's routes.
 *
 * Sign-in is public; everything else is the payor's own account and is guarded. The guard asks the API whether the
 * refresh cookie is still good before turning anyone away, because a reload leaves this app with no memory of a
 * session and no cookie it is allowed to read.
 */
export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'activate',
    loadComponent: () => import('./pages/activate/activate').then((m) => m.Activate),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'balances',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/balances/balances').then((m) => m.Balances),
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/history/history').then((m) => m.History),
  },
  // The gateway's own return addresses. The API builds them, and it keeps the path it has always used so the same
  // shape serves both payor portals while the Blazor one is retired; only the host differs.
  {
    path: 'payor/payment/success',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/payment/payment-success').then((m) => m.PaymentSuccess),
  },
  {
    path: 'payor/payment/cancelled',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/payment/payment-cancelled').then((m) => m.PaymentCancelled),
  },
  { path: '**', redirectTo: '' },
];
