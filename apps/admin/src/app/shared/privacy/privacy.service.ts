import { Injectable, computed, signal } from '@angular/core';

/** How long revealed details stay on screen without the reviewer doing anything, in milliseconds. */
export const REVEAL_IDLE_MS = 2 * 60 * 1000;

/**
 * Who has asked to see sensitive submitted details right now, and for which request.
 *
 * This is a SHOULDER-SURFING aid, not access control. The details are already in the page for any signed-in platform
 * operator - the API decides who that is (operator-only endpoints, tenant scoping) and nothing here grants or removes
 * a permission. What this adds is that the details are not painted until the reviewer asks for them, are painted for
 * one request only, and disappear again on their own.
 *
 * State is held in memory only: a reload, a new tab or a new sign-in starts hidden, and nothing is written to storage.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  /** Meeting / screen-share switch: while on, nothing can be revealed. */
  readonly privacyMode = signal(false);

  private readonly revealedRequest = signal<string | null>(null);
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  /** The request whose details are showing, or null. Always null while Privacy mode is on. */
  readonly revealedId = computed(() => (this.privacyMode() ? null : this.revealedRequest()));

  isRevealed(requestId: string | null | undefined): boolean {
    return !!requestId && this.revealedId() === requestId;
  }

  /** Shows the details of ONE request. Ignored while Privacy mode is on. */
  reveal(requestId: string): void {
    if (this.privacyMode()) return;
    this.revealedRequest.set(requestId);
    this.armIdleTimer();
  }

  /** Hides everything again. */
  hide(): void {
    this.revealedRequest.set(null);
    this.clearIdleTimer();
  }

  setPrivacyMode(on: boolean): void {
    this.privacyMode.set(on);
    if (on) this.hide();
  }

  /** Any activity by the reviewer while details are showing restarts the countdown. */
  touch(): void {
    if (this.revealedRequest()) this.armIdleTimer();
  }

  private armIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => this.hide(), REVEAL_IDLE_MS);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}
