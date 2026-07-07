import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

// ─────────────────────────────────────────────────────────────────────────────
// Real platform-operator authentication for the StallTrack admin console.
//
// Sign-in exchanges credentials at POST /api/adminauth/login for a JWT access token,
// stored client-side and sent as a Bearer on activation calls. The actual authorization
// (platform operator = SuperAdmin of the default LGU) is ENFORCED SERVER-SIDE on every
// activation request — the SPA is not a security boundary; storing the token only lets
// the console call the API on the operator's behalf.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'st_admin_session';

export interface AdminSession {
  username: string;
  displayName: string;
  token: string;
  at: number;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

interface TokenResponse {
  accessToken?: string;
  refreshToken?: string;
}

/** Best-effort read of a JWT claim (no verification — display only). */
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

  async login(username: string, password: string): Promise<LoginResult> {
    const u = (username || '').trim();
    if (!u || !password) return { ok: false, error: 'Enter your username and password.' };
    try {
      const res = await firstValueFrom(
        this.http.post<TokenResponse>(`${API_BASE_URL}/api/adminauth/login`, { username: u, password }),
      );
      const token = res?.accessToken;
      if (!token) return { ok: false, error: 'Sign in failed. Please try again.' };
      const session: AdminSession = {
        username: u,
        displayName: jwtClaim(token, NAME_CLAIM) || u,
        token,
        at: Date.now(),
      };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch {
        /* storage unavailable */
      }
      return { ok: true };
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 401) return { ok: false, error: 'Invalid administrator credentials.' };
      if (status === 429) return { ok: false, error: 'Too many attempts. Please wait a minute and try again.' };
      if (status === 0) return { ok: false, error: 'Cannot reach the server. Please check your connection.' };
      return { ok: false, error: 'Unable to sign in. Please try again.' };
    }
  }

  logout(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }

  currentUser(): AdminSession | null {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as AdminSession | null;
    } catch {
      return null;
    }
  }

  /** The stored JWT access token, or null. */
  token(): string | null {
    return this.currentUser()?.token ?? null;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser()?.token;
  }
}
