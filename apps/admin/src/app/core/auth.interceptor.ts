import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { AuthService } from './auth.service';

// ─────────────────────────────────────────────────────────────────────────────
// Cookie-based auth for every StallTrack API call:
//  • withCredentials so the browser attaches the HttpOnly access/refresh cookies (and receives updates).
//  • On a 401 (the short-lived access cookie expired), transparently refresh ONCE via the refresh cookie
//    and retry the original request — so the operator is never bumped to the login screen mid-session.
//  • If the refresh itself fails (refresh cookie gone/expired/revoked), the session is truly over: clear
//    the local marker and route to /login.
// Concurrent 401s share a single in-flight refresh (shareReplay) so we never fire N parallel refreshes.
// ─────────────────────────────────────────────────────────────────────────────

let refreshInFlight: Observable<boolean> | null = null;

function refreshOnce(http: HttpClient): Observable<boolean> {
  refreshInFlight ??= http
    .post(`${API_BASE_URL}/api/adminauth/refresh-token`, {}, { withCredentials: true })
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
  // Only touch calls to our API; leave any other host's requests untouched.
  if (!req.url.startsWith(API_BASE_URL)) return next(req);

  // Capture services here (synchronous injection context) for use inside the async pipe.
  const http = inject(HttpClient);
  const router = inject(Router);
  const auth = inject(AuthService);

  const credentialed = req.clone({ withCredentials: true });
  const isAuthEndpoint = credentialed.url.includes('/api/adminauth/');

  return next(credentialed).pipe(
    catchError((err: unknown) => {
      const status = (err as { status?: number })?.status;
      // A 401 on a normal API call → try one silent refresh, then retry. Never refresh-loop on the
      // auth endpoints themselves (login/refresh/logout).
      if (status === 401 && !isAuthEndpoint) {
        return refreshOnce(http).pipe(
          switchMap((ok) => {
            if (ok) return next(credentialed.clone({ withCredentials: true }));
            auth.clearSession();
            void router.navigate(['/login']);
            return throwError(() => err);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
