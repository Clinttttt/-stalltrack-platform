import { Injectable } from '@angular/core';

// ─────────────────────────────────────────────────────────────────────────────
// DEMO authentication for the StallTrack admin console.
//
// IMPORTANT: this is a client-side MOCK for the demo only. A public SPA cannot be a
// real security boundary — the actual protection must be enforced by the StallTrack
// API, which validates the platform-operator token on every request. When the API is
// wired, replace login()/isAuthenticated() with a real token exchange + refresh flow.
//
// Faithful Angular port of the React apps/admin/src/lib/auth.js.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'st_admin_session';

// Demo-only credentials. Do NOT ship real credentials in client code.
const DEMO = {
  username: 'admin',
  password: 'stalltrack2026',
  displayName: 'Platform Operator',
};

export interface AdminSession {
  username: string;
  displayName: string;
  at: number;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  login(username: string, password: string): LoginResult {
    const u = (username || '').trim().toLowerCase();
    if (u === DEMO.username && password === DEMO.password) {
      try {
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ username: DEMO.username, displayName: DEMO.displayName, at: Date.now() }),
        );
      } catch {
        /* storage unavailable */
      }
      return { ok: true };
    }
    return { ok: false, error: 'Invalid administrator credentials.' };
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

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
