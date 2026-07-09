import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { RequestRecord, RequestStatus } from './demo';

// ─────────────────────────────────────────────────────────────────────────────
// Assessment review API — the operator's live Stage-1 queue.
//   GET  /api/assessment/requests            (platform-operator)
//   POST /api/assessment/requests/{id}/approve
//   POST /api/assessment/requests/{id}/decline
// Bearer-authorized with the operator's token. Downstream stages (onboarding config,
// validation, activation) are not backed here yet — a real approved request advances to
// the Onboarding stage but its config is entered later (future staging endpoints).
// ─────────────────────────────────────────────────────────────────────────────

export interface AssessmentRequestDto {
  id: string;
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
  status: string;
  stage: string;
  decisionMessage: string | null;
  onboardingLink: string | null;
  submittedAt: string;
}

export type ListResult = { ok: true; requests: RequestRecord[] } | { ok: false; error: string };
export type MutateResult = { ok: true; request: RequestRecord } | { ok: false; error: string };

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

export interface MunicipalityStatusDto {
  code: string;
  name: string;
  isActive: boolean;
}
export type MunicipalitiesResult = { ok: true; municipalities: MunicipalityStatusDto[] } | { ok: false; error: string };

/** Maps a backend assessment DTO to the console's RequestRecord shape (downstream fields default empty). */
export function toRecord(d: AssessmentRequestDto): RequestRecord {
  return {
    id: d.id,
    municipality: d.municipality,
    province: d.province,
    facilitiesManaged: d.facilitiesManaged,
    requestingOffice: d.requestingOffice,
    focalPerson: d.focalPerson,
    position: d.position,
    officialEmail: d.officialEmail,
    contactNumber: d.contactNumber,
    approxVendors: d.approxVendors ?? '',
    authorizationStatus: d.authorizationStatus ?? '',
    acknowledged: d.acknowledged,
    notes: d.notes ?? '',
    submittedAt: d.submittedAt,
    status: d.status as RequestStatus,
    stage: d.stage,
    activated: false,
    decisionMessage: d.decisionMessage ?? '',
    onboardingLink: d.onboardingLink ?? '',
    log: [],
  };
}

function describeError(e: unknown): string {
  const err = e as { status?: number; error?: unknown };
  const s = err?.status;
  if (s === 401) return 'Your session has expired — please sign in again.';
  if (s === 403) return 'This account is not a platform operator.';
  if (s === 0) return 'Cannot reach the server. Please check your connection.';
  const body = err?.error as { detail?: string; message?: string; title?: string } | string | undefined;
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    if (typeof body.detail === 'string') return body.detail;
    if (typeof body.message === 'string') return body.message;
    if (typeof body.title === 'string') return body.title;
  }
  return 'Something went wrong. Please try again.';
}

@Injectable({ providedIn: 'root' })
export class AssessmentApi {
  private readonly http = inject(HttpClient);

  // Auth travels as the HttpOnly cookie (attached by the auth interceptor, which also refreshes on 401).

  async list(): Promise<ListResult> {
    try {
      const dtos = await firstValueFrom(
        this.http.get<AssessmentRequestDto[]>(`${API_BASE_URL}/api/assessment/requests`),
      );
      return { ok: true, requests: (dtos ?? []).map(toRecord) };
    } catch (e: unknown) {
      return { ok: false, error: describeError(e) };
    }
  }

  async approve(id: string, decisionMessage: string): Promise<MutateResult> {
    return this.mutate(`${API_BASE_URL}/api/assessment/requests/${id}/approve`, { decisionMessage });
  }

  async decline(id: string, decisionMessage: string): Promise<MutateResult> {
    return this.mutate(`${API_BASE_URL}/api/assessment/requests/${id}/decline`, { decisionMessage });
  }

  /** Load a submitted onboarding draft (its config) for the validation dry-run. */
  async getDraftByRequest(assessmentRequestId: string): Promise<DraftResult> {
    try {
      const draft = await firstValueFrom(
        this.http.get<OnboardingDraftDto>(`${API_BASE_URL}/api/onboarding/by-request/${assessmentRequestId}`),
      );
      return { ok: true, draft };
    } catch (e: unknown) {
      return { ok: false, error: describeError(e) };
    }
  }

  /** Approve the validation dry-run — advances the request to Activation. */
  async approveValidation(assessmentRequestId: string): Promise<MutateResult> {
    return this.mutate(`${API_BASE_URL}/api/onboarding/by-request/${assessmentRequestId}/approve-validation`, {});
  }

  /** Return the config for corrections — reopens the draft (Onboarding). */
  async returnToOnboarding(assessmentRequestId: string, note: string): Promise<MutateResult> {
    return this.mutate(`${API_BASE_URL}/api/onboarding/by-request/${assessmentRequestId}/return`, { note });
  }

  /** Public registry (anonymous) — used to tell which LGUs are already live. */
  async listMunicipalities(): Promise<MunicipalitiesResult> {
    try {
      const list = await firstValueFrom(
        this.http.get<Array<{ code: string; name: string; isActive: boolean }>>(`${API_BASE_URL}/api/municipalities`),
      );
      return { ok: true, municipalities: (list ?? []).map((m) => ({ code: m.code, name: m.name, isActive: m.isActive })) };
    } catch (e: unknown) {
      return { ok: false, error: describeError(e) };
    }
  }

  private async mutate(url: string, body: unknown): Promise<MutateResult> {
    try {
      const dto = await firstValueFrom(this.http.post<AssessmentRequestDto>(url, body));
      return { ok: true, request: toRecord(dto) };
    } catch (e: unknown) {
      return { ok: false, error: describeError(e) };
    }
  }
}
