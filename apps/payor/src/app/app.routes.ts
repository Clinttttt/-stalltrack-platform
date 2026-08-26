import { Route } from '@angular/router';

/**
 * The portal's routes.
 *
 * One route for now, and it says plainly that the portal is not in service. The screens themselves (the payor's
 * accounts, their balances, their history and a receipt) come next, and each needs the session question answered
 * first: the API's payor endpoints hand tokens back in the response body, while the operator console keeps its
 * access token in memory behind a refresh cookie. Shipping a login against the wrong one is worse than shipping
 * none.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./pages/not-in-service/not-in-service').then((m) => m.NotInService),
  },
  { path: '**', redirectTo: '' },
];
