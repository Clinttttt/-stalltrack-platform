import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

/** Payload for a public LGU assessment request — mirrors the backend SubmitAssessmentRequestCommand. */
export interface AssessmentRequestPayload {
  municipality: string;
  province: string;
  requestingOffice: string;
  focalPerson: string;
  position: string;
  officialEmail: string;
  contactNumber: string;
  facilitiesManaged: string;
  approxVendors: string | null;
  authorizationStatus: string | null;
  acknowledged: boolean;
  notes: string | null;
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

function describeError(e: unknown): string {
  const err = e as { status?: number; error?: unknown };
  const s = err?.status;
  if (s === 0) return 'Cannot reach the server. Please check your connection and try again.';
  if (s === 429) return 'Too many requests. Please wait a moment and try again.';
  const body = err?.error as { detail?: string; message?: string; title?: string; errors?: Record<string, unknown> } | string | undefined;
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    if (typeof body.detail === 'string') return body.detail;
    if (typeof body.message === 'string') return body.message;
    if (body.errors && typeof body.errors === 'object') {
      const parts: string[] = [];
      for (const v of Object.values(body.errors)) {
        if (Array.isArray(v)) parts.push(...v.map((x) => String(x)));
        else if (typeof v === 'string') parts.push(v);
      }
      if (parts.length) return parts.join(' ');
    }
    if (typeof body.title === 'string') return body.title;
  }
  return 'We could not submit your request. Please review the form and try again.';
}

/** Data-access seam for public assessment submission (Stage 1). */
@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private readonly http = inject(HttpClient);

  async submit(payload: AssessmentRequestPayload): Promise<SubmitResult> {
    try {
      await firstValueFrom(this.http.post(`${API_BASE_URL}/api/assessment/requests`, payload));
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, error: describeError(e) };
    }
  }
}
