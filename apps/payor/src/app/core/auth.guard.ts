import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guards the payor's own screens.
 *
 * A reload leaves the app with no memory of a session and no readable cookie, so the guard asks the API whether the
 * refresh cookie is still good before it sends anyone to sign in again. Without that, every refresh of the page
 * would look like a signed-out visitor even with a perfectly valid session.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.signedIn()) return true;
  if (await auth.restore()) return true;

  await router.navigate(['/login']);
  return false;
};
