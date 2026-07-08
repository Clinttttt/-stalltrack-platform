import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type SetupSubmitResult = { ok: true } | { ok: false; error: string };

/** First-run bootstrap for the dedicated platform/console operator. */
@Injectable({ providedIn: 'root' })
export class PlatformSetupService {
  private readonly http = inject(HttpClient);

  async isSetupRequired(): Promise<boolean> {
    try {
      const r = await firstValueFrom(
        this.http.get<{ isSetupRequired: boolean }>(`${API_BASE_URL}/api/platform-setup/status`),
      );
      return !!r?.isSetupRequired;
    } catch {
      // Fail-safe: never block sign-in if the status check fails.
      return false;
    }
  }

  async createFirstOperator(payload: { fullName: string; username: string; email: string; password: string }): Promise<SetupSubmitResult> {
    try {
      await firstValueFrom(this.http.post(`${API_BASE_URL}/api/platform-setup/create-first-operator`, payload));
      return { ok: true };
    } catch (e: unknown) {
      const err = e as { status?: number; error?: unknown };
      if (err?.status === 409) return { ok: false, error: 'A platform operator already exists. Please sign in.' };
      if (err?.status === 0) return { ok: false, error: 'Cannot reach the server. Please try again.' };
      const body = err?.error as { detail?: string; message?: string; title?: string; errors?: Record<string, unknown> } | string | undefined;
      let msg: string | undefined;
      if (typeof body === 'string') msg = body;
      else if (body && typeof body === 'object') {
        if (body.errors && typeof body.errors === 'object') {
          const parts: string[] = [];
          for (const v of Object.values(body.errors)) {
            if (Array.isArray(v)) parts.push(...v.map((x) => String(x)));
            else if (typeof v === 'string') parts.push(v);
          }
          if (parts.length) msg = parts.join(' ');
        }
        msg = msg || body.detail || body.message || body.title;
      }
      return { ok: false, error: msg || 'Could not create the operator account. Please review the form.' };
    }
  }
}
