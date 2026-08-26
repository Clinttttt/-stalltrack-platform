import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

/**
 * The payor portal's providers.
 *
 * No auth interceptor yet, deliberately. The console holds its access token in memory and refreshes through a
 * cookie, while the payor endpoints on the API return their tokens in the response body. Which of those this
 * portal follows is the office's decision, and an interceptor written before it is answered would have to be
 * unwritten. The HTTP client is here because every screen will need it.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(appRoutes),
  ],
};
