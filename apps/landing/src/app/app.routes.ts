import { Route } from '@angular/router';

/**
 * Route map:
 *   '/'                        -> Home (public landing)
 *   '/municipalities'          -> SelectMunicipality (CARCANMADCARLAN selector)
 *   '/municipalities/:code'    -> MunicipalityRollout
 *   '/select-municipality'     -> SelectMunicipality
 *   '/assessment-received'     -> AssessmentReceived
 *   '/onboarding/:token'       -> Onboarding
 *   '/privacy'                 -> Privacy
 *   '/terms'                   -> Terms
 *   '/thanks'                  -> ThankYou
 * Unknown paths fall back to Home.
 */
export const appRoutes: Route[] = [
  { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  {
    path: 'municipalities',
    loadComponent: () =>
      import('./pages/select-municipality/select-municipality').then((m) => m.SelectMunicipality),
  },
  {
    path: 'municipalities/:code',
    loadComponent: () =>
      import('./pages/municipality-rollout/municipality-rollout').then((m) => m.MunicipalityRollout),
  },
  {
    path: 'select-municipality',
    loadComponent: () =>
      import('./pages/select-municipality/select-municipality').then((m) => m.SelectMunicipality),
  },
  {
    path: 'assessment-received',
    loadComponent: () =>
      import('./pages/assessment-received/assessment-received').then((m) => m.AssessmentReceived),
  },
  {
    path: 'onboarding/:token',
    loadComponent: () => import('./pages/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy').then((m) => m.Privacy),
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/terms/terms').then((m) => m.Terms),
  },
  {
    path: 'thanks',
    loadComponent: () => import('./pages/thank-you/thank-you').then((m) => m.ThankYou),
  },
  { path: '**', redirectTo: '' },
];
