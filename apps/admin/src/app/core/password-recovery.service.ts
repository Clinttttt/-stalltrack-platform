import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

/** Whose account a reset token belongs to, so the screen can name it before a password is set. */
export interface ResetContext {
  username: string;
  fullName: string | null;
}

/**
 * Self-service password recovery for the platform operator.
 *
 * The API's endpoints are the same ones the municipal console uses — one flow, one set of rules — and they are anonymous
 * and rate-limited there, because somebody who cannot sign in is the only person who needs them.
 *
 * A request NEVER reports whether an address is known. The API answers the same way for an address it has never seen as
 * for one it has just emailed, and this service passes that through rather than trying to be helpful: telling a stranger
 * which addresses hold a platform-operator account is telling them where to point an attack.
 */
@Injectable({ providedIn: 'root' })
export class PasswordRecoveryService {
  private readonly http = inject(HttpClient);

  /** Asks for a reset link. Resolves the same way whether or not the address is known. */
  async request(email: string): Promise<{ ok: boolean; error?: string }> {
    const address = (email || '').trim();
    if (!address) return { ok: false, error: 'Enter the email address on your operator account.' };

    try {
      await firstValueFrom(
        this.http.post(`${API_BASE_URL}/api/adminauth/forgot-password`, { email: address }),
      );
      return { ok: true };
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      // Too many attempts is worth saying, because waiting is the answer. Anything else is stated plainly without
      // implying anything about the address.
      if (status === 429) return { ok: false, error: 'Too many attempts. Wait a moment and try again.' };
      if (status === 0) return { ok: false, error: 'No connection. Check your network and try again.' };
      return { ok: false, error: 'That request could not be sent just now. Try again in a moment.' };
    }
  }

  /** Which account the emailed link belongs to. Null when the token is unknown, used or expired. */
  async context(token: string): Promise<ResetContext | null> {
    try {
      const dto = await firstValueFrom(
        this.http.get<ResetContext>(`${API_BASE_URL}/api/adminauth/reset-context/${encodeURIComponent(token)}`),
      );
      return dto ?? null;
    } catch {
      return null;
    }
  }

  /** Sets the new password. The API decides whether the token is still good and what a password must be. */
  async reset(token: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.http.post(`${API_BASE_URL}/api/adminauth/reset-password`, { token, newPassword }),
      );
      return { ok: true };
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      const body = (e as { error?: { error?: string; message?: string } })?.error;

      // The API's own wording is preferred where it sent some: it states which rule a password failed, and replacing
      // that with something vague leaves the operator guessing at their own password.
      if (body?.error) return { ok: false, error: body.error };
      if (body?.message) return { ok: false, error: body.message };
      if (status === 429) return { ok: false, error: 'Too many attempts. Wait a moment and try again.' };
      if (status === 0) return { ok: false, error: 'No connection. Check your network and try again.' };
      return { ok: false, error: 'That password could not be set. Ask for a new link and try again.' };
    }
  }

  /**
   * Whether the caller's own email address has been confirmed, and which address it is.
   *
   * Asked because a self-service reset is only ever sent to a confirmed address: an account whose address was never
   * confirmed has no way back on its own, and the operator is the account with nobody above it to restore it.
   */
  async myEmailConfirmation(): Promise<{ email: string | null; verified: boolean } | null> {
    try {
      const dto = await firstValueFrom(
        this.http.get<{ email: string | null; verified: boolean }>(
          `${API_BASE_URL}/api/adminauth/my-email-confirmation`,
        ),
      );
      return dto ?? null;
    } catch {
      // Presentation only: an unanswered check leaves the notice hidden rather than guessing at the account's state.
      return null;
    }
  }

  /** Sends the caller its own confirmation link. The subject is the token's account, so no id is passed. */
  async sendMyEmailConfirmation(): Promise<{ ok: boolean; error?: string }> {
    try {
      await firstValueFrom(this.http.post(`${API_BASE_URL}/api/adminauth/my-email-confirmation/send`, {}));
      return { ok: true };
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      const body = (e as { error?: { error?: string; message?: string } })?.error;

      if (body?.error) return { ok: false, error: body.error };
      if (body?.message) return { ok: false, error: body.message };
      if (status === 429) return { ok: false, error: 'Too many attempts. Wait a moment and try again.' };
      return { ok: false, error: 'The confirmation email could not be sent just now.' };
    }
  }
}
