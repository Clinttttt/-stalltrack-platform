import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { AuthService } from './auth.service';

/**
 * Cookie auth for every call to the StallTrack API, the same shape the operator console uses.
 *
 *  • `withCredentials` so the browser attaches the HttpOnly access and refresh cookies, and accepts their updates.
 *  • On a 401, which is the fifteen-minute access cookie expiring, refresh ONCE and retry the original request, so a
 *    stallholder reading their balances is not thrown back to a sign-in screen mid-session.
 *  • If the refresh itself fails, the session is genuinely over: mark it ended and route to sign-in.
 *
 * Concurrent 401s share one in-flight refresh, so a screen that loads three things does not fire three refreshes and
 * spend two of them.
 */
let refreshInFlight: Observable<boolean> | null = null;

function refreshOnce(http: HttpClient): Observable<boolean> {
  refreshInFlight ??= http
    .post(`${API_BASE_URL}/api/payorauth/refresh-token`, {}, { withCredentials: true })
    .pipe(
      map(() => true),
      catchError(() => of(false)),
      finalize(() => {
        refreshInFlight = null;
      }),
      shareReplay(1),
    );
  return refreshInFlight;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only our API. Any other host's requests are left exactly as they were.
  if (!req.url.startsWith(API_BASE_URL)) return next(req);

  const http = inject(HttpClient);
  const router = inject(Router);
  const auth = inject(AuthService);

  const credentialed = req.clone({ withCredentials: true });
  // Never refresh in response to the auth endpoints themselves, or a failed sign-in becomes a refresh loop.
  const isAuthEndpoint = credentialed.url.includes('/api/payorauth/');

  return next(credentialed).pipe(
    catchError((error: unknown) => {
      const status = (error as { status?: number } | null)?.status;

      if (status !== 401 || isAuthEndpoint) return throwError(() => error);

      return refreshOnce(http).pipe(
        switchMap((renewed) => {
          if (renewed) return next(credentialed);

          auth.sessionEnded();
          void router.navigate(['/login']);
          return throwError(() => error);
        }),
      );
    }),
  );
};
