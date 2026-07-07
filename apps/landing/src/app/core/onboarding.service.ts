import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

/** Mirrors the backend OnboardingDraftDto. */
export interface OnboardingDraftDto {
  id: string;
  assessmentRequestId: string;
  municipality: string;
  province: string;
  configJson: string | null;
  isSubmittedForValidation: boolean;
  submittedAt: string | null;
  expiresAt: string;
  isExpired: boolean;
}

export type DraftResult = { ok: true; draft: OnboardingDraftDto } | { ok: false; error: string };

function describeError(e: unknown): string {
  const err = e as { status?: number; error?: unknown };
  const s = err?.status;
  if (s === 404) return 'This onboarding link is invalid or has expired.';
  if (s === 0) return 'Cannot reach the server. Please check your connection and try again.';
  if (s === 429) return 'Too many requests. Please wait a moment and try again.';
  const body = err?.error as { detail?: string; message?: string; title?: string } | string | undefined;
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    if (typeof body.detail === 'string') return body.detail;
    if (typeof body.message === 'string') return body.message;
    if (typeof body.title === 'string') return body.title;
  }
  return 'Something went wrong. Please try again.';
}

/** Data-access seam for the LGU onboarding workspace (Stage 2, by secure token). */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);

  async getDraft(token: string): Promise<DraftResult> {
    try {
      const draft = await firstValueFrom(
        this.http.get<OnboardingDraftDto>(`${API_BASE_URL}/api/onboarding/${encodeURIComponent(token)}`),
      );
      return { ok: true, draft };
    } catch (e: unknown) {
      return { ok: false, error: describeError(e) };
    }
  }

  async saveConfig(token: string, configJson: string): Promise<DraftResult> {
    try {
      const draft = await firstValueFrom(
        this.http.put<OnboardingDraftDto>(`${API_BASE_URL}/api/onboarding/${encodeURIComponent(token)}`, { configJson }),
      );
      return { ok: true, draft };
    } catch (e: unknown) {
      return { ok: false, error: describeError(e) };
    }
  }

  async submit(token: string): Promise<DraftResult> {
    try {
      const draft = await firstValueFrom(
        this.http.post<OnboardingDraftDto>(`${API_BASE_URL}/api/onboarding/${encodeURIComponent(token)}/submit`, {}),
      );
      return { ok: true, draft };
    } catch (e: unknown) {
      return { ok: false, error: describeError(e) };
    }
  }
}
