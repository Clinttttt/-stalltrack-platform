import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    // Mirror React App.jsx <ScrollToTop />: reset scroll to top on route change,
    // and scroll to the matching element for in-page hash/anchor links.
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })
    )
  ]
};
