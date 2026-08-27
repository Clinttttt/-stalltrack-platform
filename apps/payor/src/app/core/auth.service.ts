import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

/**
 * The payor's session, held entirely in cookies the browser will not show us.
 *
 * `POST api/payorauth/login`, `activate` and `refresh-token` set an access cookie and a refresh cookie that are
 * HttpOnly, Secure and SameSite=Strict, the same pair the operator console uses. Strict is satisfied because every
 * StallTrack site is a subdomain of one registrable domain, so a request from payor.stalltrack.site to
 * api.stalltrack.site is same-site.
 *
 * Nothing about the session is readable by script, and nothing is written to storage. That is the whole point: a
 * token in localStorage can be read by anything that reaches this origin, and this portal shows a person's own
 * account and can start a payment. So this service holds one boolean, whether the last request that needed a
 * session succeeded, and the browser holds the rest.
 *
 * The tokens still arrive in the response body, because the Blazor portal reads them from there and was not going
 * to be broken for this. This service deliberately ignores them.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /** What the app believes about the cookies it cannot read. Confirmed by the API, never asserted from storage. */
  private readonly established = signal(false);

  readonly signedIn = computed(() => this.established());

  /** Set from the payor's own account data, never from a token. */
  private readonly displayName = signal<string | null>(null);
  readonly name = computed(() => this.displayName());

  nameIs(name: string | null): void {
    this.displayName.set(name && name.trim().length > 0 ? name.trim() : null);
  }

  async login(contactNumber: string, password: string): Promise<string | null> {
    return this.exchange(`${API_BASE_URL}/api/payorauth/login`, { contactNumber, password });
  }

  /**
   * First sign-in with the code the office issued; it sets the payor's password and signs them in.
   *
   * No name is sent. The code and the registered number are the whole proof of ownership, and the API takes the payor's
   * name from the office's own register for the stall the code was issued for, so a typo can no longer become the name
   * on the account.
   */
  async activate(activationCode: string, contactNumber: string, password: string): Promise<string | null> {
    return this.exchange(`${API_BASE_URL}/api/payorauth/activate`, {
      activationCode,
      contactNumber,
      password,
    });
  }

  /**
   * Asks the API whether the refresh cookie is still good, which is the only way this app can know: a reload leaves
   * it with no memory and no readable cookie. A refusal simply means signing in again.
   */
  async restore(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post(`${API_BASE_URL}/api/payorauth/refresh-token`, {}, { withCredentials: true }),
      );
      this.established.set(true);
      return true;
    } catch {
      this.established.set(false);
      return false;
    }
  }

  /** Revokes the refresh token and clears the cookies at the API, so signing out is never merely local. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${API_BASE_URL}/api/payorauth/logout`, {}, { withCredentials: true }),
      );
    } catch {
      // Already expired or revoked. The cookies are cleared by the same response either way.
    }
    this.established.set(false);
    this.displayName.set(null);
  }

  /** Called by the interceptor when a refresh could not save a request. */
  sessionEnded(): void {
    this.established.set(false);
    this.displayName.set(null);
  }

  private async exchange(url: string, body: unknown): Promise<string | null> {
    try {
      await firstValueFrom(this.http.post(url, body, { withCredentials: true }));
      this.established.set(true);
      return null;
    } catch (error: unknown) {
      this.established.set(false);
      return messageFor(error);
    }
  }
}

/**
 * What to tell the payor. The API's own message is preferred where it sent one, because it was written for the
 * person reading it; replacing a specific refusal with a vague one helps nobody.
 */
function messageFor(error: unknown): string {
  const body = (error as { error?: { message?: string; detail?: string } } | null)?.error;
  const status = (error as { status?: number } | null)?.status;

  if (body?.message) return body.message;
  if (body?.detail) return body.detail;
  if (status === 401 || status === 400) return 'That mobile number and password do not match an account.';
  if (status === 429) return 'Too many attempts. Wait a moment and try again.';
  if (status === 0) return 'No connection. Check your signal and try again.';
  return 'Something went wrong signing you in. Try again.';
}
