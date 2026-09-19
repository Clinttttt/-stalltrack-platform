import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_BASE_URL } from './api.config';
import type { Municipality } from './municipality.model';
import { getMunicipality, mergeLiveMunicipalities, municipalities } from './municipalities';
import type { RegistryEntry } from './municipalities';

/**
 * The landing's single municipality registry. The committed build-time snapshot renders immediately; the anonymous
 * API then refreshes rollout state from the live database. A failed refresh deliberately leaves the snapshot intact.
 */
@Injectable({ providedIn: 'root' })
export class MunicipalityService {
  private readonly http = inject(HttpClient);
  private readonly registry = signal<readonly Municipality[]>(municipalities);

  readonly all = this.registry.asReadonly();
  readonly resolving = signal(true);

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.resolving.set(true);
    try {
      const live = await firstValueFrom(
        this.http.get<RegistryEntry[]>(`${API_BASE_URL}/api/municipalities`).pipe(timeout(8_000)),
      );
      this.registry.set(mergeLiveMunicipalities(municipalities, live ?? []));
    } catch {
      // The committed registry is an intentional resilient fallback. Do not empty or partially replace it.
      this.registry.set(municipalities);
    } finally {
      this.resolving.set(false);
    }
  }

  getByCode(code: string | null | undefined): Municipality | undefined {
    return getMunicipality(this.registry(), code);
  }
}
