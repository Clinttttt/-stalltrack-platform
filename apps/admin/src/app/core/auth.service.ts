import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

// ─────────────────────────────────────────────────────────────────────────────
// Platform-operator authentication for the StallTrack admin console.
//
// The JWT access + refresh tokens are NEVER exposed to JavaScript. POST /api/adminauth/login
// sets them as HttpOnly, Secure, SameSite cookies on the api.stalltrack.site domain (same site as
// admin.stalltrack.site), so the browser attaches them automatically on every credentialed API call
// (see auth.interceptor.ts, which sets withCredentials) and an XSS payload cannot read them. The access
// token is short-lived (15 min); when it expires the interceptor silently refreshes it via the refresh
// cookie (POST /api/adminauth/refresh-token), so the operator stays signed in without re-entering
// credentials. Only a NON-SENSITIVE display marker (name/username) is kept client-side; authorization
// (platform operator = SuperAdmin of the default LGU) is enforced SERVER-SIDE on every request.
// ─────────────────────────────────────────────────────────────────────────────

const DISPLAY_KEY = 'st_admin_operator';

export interface AdminSession {
  username: string;
  displayName: string;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

interface TokenResponse {
  accessToken?: string;
  refreshToken?: string;
}

/** Best-effort read of a JWT claim (no verification — display only; the token is never stored). */
function jwtClaim(token: string, claim: string): string | undefined {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json?.[claim];
  } catch {
    return undefined;
  }
}

const NAME_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private session: AdminSession | null = readMarker();

  async login(username: string, password: string): Promise<LoginResult> {
    const u = (username || '').trim();
    if (!u || !password) return { ok: false, error: 'Enter your username and password.' };
    try {
      // withCredentials lets the API set the HttpOnly auth cookies on this response.
      const res = await firstValueFrom(
        this.http.post<TokenResponse>(
          `${API_BASE_URL}/api/adminauth/login`,
          { username: u, password },
          { withCredentials: true },
        ),
      );
      // The token also comes back in the body; we read the display name from it in-memory (for the UI
      // chrome) but never persist the token — the browser holds it as an HttpOnly cookie.
      const displayName = res?.accessToken ? jwtClaim(res.accessToken, NAME_CLAIM) || u : u;
      this.setSession({ username: u, displayName });
      return { ok: true };
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 401 || status === 404) return { ok: false, error: 'Invalid administrator credentials.' };
      if (status === 429) return { ok: false, error: 'Too many attempts. Please wait a minute and try again.' };
      if (status === 0) return { ok: false, error: 'Cannot reach the server. Please check your connection.' };
      return { ok: false, error: 'Unable to sign in. Please try again.' };
    }
  }

  /** Clears the session: revokes the refresh token + clears the auth cookies server-side, then the marker. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${API_BASE_URL}/api/adminauth/logout`, {}, { withCredentials: true }));
    } catch {
      /* best-effort — always clear the local marker below */
    }
    this.clearSession();
  }

  currentUser(): AdminSession | null {
    return this.session;
  }

  isAuthenticated(): boolean {
    return this.session !== null;
  }

  /** Forgets the local session marker (called by the interceptor when a refresh is rejected). */
  clearSession(): void {
    this.session = null;
    try {
      localStorage.removeItem(DISPLAY_KEY);
    } catch {
      /* ignore */
    }
  }

  private setSession(session: AdminSession): void {
    this.session = session;
    try {
      localStorage.setItem(DISPLAY_KEY, JSON.stringify(session));
    } catch {
      /* storage unavailable — session still lives in-memory for this tab */
    }
  }
}

function readMarker(): AdminSession | null {
  try {
    return JSON.parse(localStorage.getItem(DISPLAY_KEY) || 'null') as AdminSession | null;
  } catch {
    return null;
  }
}
