import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type SetupSubmitResult =
  | { ok: true }
  /** `alreadySetUp` means an operator genuinely exists, so the only way forward is to sign in. */
  | { ok: false; error: string; alreadySetUp?: boolean };

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
      if (err?.status === 0) return { ok: false, error: 'Cannot reach the server. Please try again.' };

      const served = this.messageFrom(err?.error);

      // A 409 is the API saying an operator already exists. It used to be the only thing this branch could
      // say, and it said it for every 409 — including a duplicate e-mail address, which the database reports
      // as a unique violation and the middleware turns into a 409. The office was told setup was finished
      // while the status endpoint kept reporting, correctly, that no operator existed. So the server's own
      // wording comes first now, and the sign-in route is only offered when the server really says so.
      if (err?.status === 409) {
        return {
          ok: false,
          error: served || 'A platform operator already exists for this console. Please sign in.',
          alreadySetUp: true,
        };
      }

      return { ok: false, error: served || 'Could not create the operator account. Please review the form.' };
    }
  }

  /**
   * The message the API sent, whatever shape it used. This API answers `{ isSuccess, error }`, and reading
   * only `detail`/`message`/`title` meant every stated reason it gave — a username in use, an address already
   * held — was discarded and replaced with a generic line.
   */
  private messageFrom(body: unknown): string | undefined {
    if (typeof body === 'string') return body.trim() || undefined;
    if (!body || typeof body !== 'object') return undefined;

    const b = body as {
      error?: unknown;
      detail?: unknown;
      message?: unknown;
      title?: unknown;
      errors?: Record<string, unknown>;
    };

    if (b.errors && typeof b.errors === 'object') {
      const parts: string[] = [];
      for (const v of Object.values(b.errors)) {
        if (Array.isArray(v)) parts.push(...v.map((x) => String(x)));
        else if (typeof v === 'string') parts.push(v);
      }
      if (parts.length) return parts.join(' ');
    }

    for (const candidate of [b.error, b.detail, b.message, b.title]) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    return undefined;
  }
}
