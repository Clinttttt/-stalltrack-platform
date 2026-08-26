import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

/**
 * The payor portal's providers.
 *
 * The interceptor is what carries the session: it attaches the HttpOnly cookies to every API call and renews them
 * once on a 401. Nothing here holds a token, because nothing in this app is allowed to see one.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(appRoutes),
  ],
};
