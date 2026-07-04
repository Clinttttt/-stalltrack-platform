import { Injectable } from '@angular/core';
import { Municipality } from './municipality.model';
import { getMunicipality, municipalities } from './municipalities';

/** Data-access seam for the municipality registry. Swappable for an HTTP-backed source later. */
@Injectable({ providedIn: 'root' })
export class MunicipalityService {
  readonly all: readonly Municipality[] = municipalities;

  getByCode(code: string | null | undefined): Municipality | undefined {
    return getMunicipality(code);
  }
}
