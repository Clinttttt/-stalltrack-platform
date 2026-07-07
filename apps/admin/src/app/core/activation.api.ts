import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { AuthService } from './auth.service';

// ─────────────────────────────────────────────────────────────────────────────
// Activation API — commits a staged onboarding configuration to a live LGU via
// POST /api/activation/municipality (platform-operator only, Bearer token).
//
// The command mirrors the backend ActivateMunicipalityCommand 1:1. Enums are sent as
// their string names (the API uses JsonStringEnumConverter); [Flags] ApplicableFees is
// a comma-joined string (e.g. "DailyRental, FishFee"). Activation is ONE-WAY and atomic:
// a rejected/invalid command commits nothing.
// ─────────────────────────────────────────────────────────────────────────────

export type FacilityCodeStr = 'NPM' | 'TCC' | 'NCC' | 'BBQ' | 'ICE' | 'SLH' | 'TRM' | 'TPM';
export type BillingArchetypeStr = 'DailyStall' | 'MonthlyRental' | 'WeeklyMarket' | 'PerTrip' | 'PerHead' | 'Custom';
export type MarketSectionStr = 'VegetableArea' | 'FishSection' | 'MeatSection';
export type FeeRateKeyStr =
  | 'NpmDailyStall'
  | 'NpmFishPerKilo'
  | 'SlhHogPerHead'
  | 'SlhLargePerHead'
  | 'TpmVendorDay'
  | 'TrmPerTrip'
  | 'ElecPerKwh'
  | 'WaterPerCubicMeter';

export interface ActivationStallGroup {
  count: number;
  monthlyRate: number;
  dailyRate: number | null;
  fees: string; // ApplicableFees flags, comma-joined (e.g. "DailyRental, FishFee")
  section: MarketSectionStr | null;
}

export interface ActivationFacility {
  code: FacilityCodeStr;
  name: string;
  shortName: string;
  archetype: BillingArchetypeStr;
  stallGroups?: ActivationStallGroup[];
}

export interface ActivationRate {
  facilityCode: FacilityCodeStr;
  key: FeeRateKeyStr;
  amount: number;
}

export interface ActivationCustomAnimal {
  animalName: string;
  ratePerHead: number;
}

export interface ActivationOrSeries {
  prefix: string | null;
  startNumber: number;
  padWidth: number;
  enabled: boolean;
}

export interface ActivationBranding {
  officeName: string;
  address: string | null;
  sealPath: string | null;
  officeAcronym: string | null;
}

export interface ActivationAdministrator {
  fullName: string;
  username: string;
  email: string;
}

export interface ActivateMunicipalityCommand {
  municipalityCode: string;
  branding: ActivationBranding;
  administrator: ActivationAdministrator;
  facilities: ActivationFacility[];
  rates: ActivationRate[];
  customAnimals?: ActivationCustomAnimal[];
  orSeries?: ActivationOrSeries;
}

export interface ActivationResultDto {
  municipalityId: string;
  municipalityCode: string;
  adminUsername: string;
  activationToken: string;
  facilitiesCreated: number;
  ratesCreated: number;
  stallsCreated: number;
  customAnimalTypesCreated: number;
  orSeriesConfigured: boolean;
}

export type ActivateResult = { ok: true; result: ActivationResultDto } | { ok: false; error: string };

function extractMessage(body: unknown): string | undefined {
  if (!body) return undefined;
  if (typeof body === 'string') return body;
  const b = body as { detail?: unknown; message?: unknown; title?: unknown; errors?: Record<string, unknown> };
  if (typeof b.detail === 'string') return b.detail;
  if (typeof b.message === 'string') return b.message;
  if (b.errors && typeof b.errors === 'object') {
    const parts: string[] = [];
    for (const v of Object.values(b.errors)) {
      if (Array.isArray(v)) parts.push(...v.map((x) => String(x)));
      else if (typeof v === 'string') parts.push(v);
    }
    if (parts.length) return parts.join(' ');
  }
  if (typeof b.title === 'string') return b.title;
  return undefined;
}

function describeError(e: unknown): string {
  const err = e as { status?: number; error?: unknown };
  const s = err?.status;
  if (s === 401) return 'Your session has expired — please sign in again.';
  if (s === 403) return 'This account is not a platform operator, so it cannot activate municipalities.';
  if (s === 0) return 'Cannot reach the server. Please check your connection and try again.';
  const msg = extractMessage(err?.error);
  if (s === 400) return msg || 'The configuration was rejected. Please review the facilities, rates, and administrator.';
  if (s === 404) return msg || 'This municipality is not registered for activation.';
  if (s === 409) return msg || 'This municipality is already active.';
  return msg || 'Activation failed. Please try again.';
}

@Injectable({ providedIn: 'root' })
export class ActivationApi {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  async activate(command: ActivateMunicipalityCommand): Promise<ActivateResult> {
    const token = this.auth.token();
    if (!token) return { ok: false, error: 'Your session has expired — please sign in again.' };
    try {
      const result = await firstValueFrom(
        this.http.post<ActivationResultDto>(`${API_BASE_URL}/api/activation/municipality`, command, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return { ok: true, result };
    } catch (e: unknown) {
      return { ok: false, error: describeError(e) };
    }
  }
}
