import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

/** The office a payor belongs to, as it identifies itself on its own documents. */
export interface OfficeBranding {
  code: string;
  tenantCode: string;
  name: string;
  province: string;
  officeName: string;
  sealPath: string | null;
  officeAcronym: string | null;
}

/**
 * Which office the signed-in payor belongs to.
 *
 * One address serves every municipality here, so the office cannot be read from the host as the Blazor portal reads it.
 * It comes from the payor's own account instead: `GET api/municipalities/current/branding` resolves the tenant from the
 * session. Before sign-in there is no office to name, which is why the sign-in screen carries the platform's mark and
 * not a municipal seal it would be guessing at.
 */
@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);

  private readonly current = signal<OfficeBranding | null>(null);

  readonly office = computed(() => this.current());
  readonly officeName = computed(() => this.current()?.officeName ?? '');
  readonly acronym = computed(() => this.current()?.officeAcronym ?? '');
  readonly municipality = computed(() => this.current()?.name ?? '');
  readonly province = computed(() => this.current()?.province ?? '');
  readonly sealUrl = computed(() => this.current()?.sealPath ?? null);

  /** Loaded once per session. A failure leaves the header unbranded rather than blocking the screens behind it. */
  async ensureLoaded(): Promise<void> {
    if (this.current() !== null) return;

    try {
      const branding = await firstValueFrom(
        this.http.get<OfficeBranding>(`${API_BASE_URL}/api/municipalities/current/branding`),
      );
      if (branding) this.current.set(branding);
    } catch {
      // Presentation only. A payor's balances matter more than the seal above them.
    }
  }

  forget(): void {
    this.current.set(null);
  }
}
