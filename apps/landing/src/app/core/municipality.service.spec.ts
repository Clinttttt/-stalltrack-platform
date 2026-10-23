import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL, PORTAL_LOGIN_URL } from './api.config';
import { MunicipalityService } from './municipality.service';
import { mergeLiveMunicipalities, municipalities } from './municipalities';

describe('MunicipalityService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      http.verify();
    } finally {
      // Never leak an instantiated TestBed when a prior assertion fails.
      TestBed.resetTestingModule();
    }
  });

  it('replaces stale snapshot rollout state with the live municipality registry', async () => {
    const service = TestBed.inject(MunicipalityService);

    expect(service.getByCode('carmen')?.status).toBe('Upcoming');
    expect(service.resolving()).toBe(true);

    http.expectOne(`${API_BASE_URL}/api/municipalities`).flush([
      { code: 'CARMEN', name: 'Carmen', status: 'Active', isActive: true },
    ]);
    await vi.waitFor(() => expect(service.resolving()).toBe(false));

    const carmen = service.getByCode('carmen');
    expect(carmen?.status).toBe('Active');
    expect(carmen?.active).toBe(true);
    expect(carmen?.href).toBe(`${PORTAL_LOGIN_URL}?lgu=carmen`);
    expect(carmen?.image).toBe('/carcanmadcarlan/backgrounds/carmen-reference.png');
  });

  it('honors the shared API when the older build snapshot incorrectly marks LGUs active', async () => {
    const service = TestBed.inject(MunicipalityService);

    // The snapshot may be refreshed independently of this test. Prove the precedence
    // rule with an explicitly stale copy, rather than assuming local registry contents.
    const stale = municipalities.map((entry) => ['carrascal', 'madrid'].includes(entry.code)
      ? { ...entry, status: 'Active' as const, active: true } : entry);
    const fromStale = mergeLiveMunicipalities(stale, [
      { code: 'CARRASCAL', status: 'Upcoming', isActive: false },
      { code: 'MADRID', status: 'Upcoming', isActive: false },
    ]);
    expect(fromStale.find((entry) => entry.code === 'carrascal')?.status).toBe('Upcoming');
    expect(fromStale.find((entry) => entry.code === 'madrid')?.active).toBe(false);

    http.expectOne(`${API_BASE_URL}/api/municipalities`).flush([
      { code: 'CANTILAN', name: 'Cantilan', status: 'Active', isActive: true },
      { code: 'CARRASCAL', name: 'Carrascal', status: 'Upcoming', isActive: false },
      { code: 'MADRID', name: 'Madrid', status: 'Upcoming', isActive: false },
    ]);
    await vi.waitFor(() => expect(service.resolving()).toBe(false));

    expect(service.getByCode('cantilan')?.status).toBe('Active');
    expect(service.getByCode('carrascal')?.status).toBe('Upcoming');
    expect(service.getByCode('madrid')?.status).toBe('Upcoming');
    expect(service.getByCode('carrascal')?.href).toBeUndefined();
    expect(service.getByCode('madrid')?.href).toBeUndefined();
  });

  it('keeps the committed snapshot usable when the live registry request fails', async () => {
    const service = TestBed.inject(MunicipalityService);
    const initialCarmenStatus = service.getByCode('carmen')?.status;

    http.expectOne(`${API_BASE_URL}/api/municipalities`).flush('Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    await vi.waitFor(() => expect(service.resolving()).toBe(false));

    expect(service.all().length).toBeGreaterThan(0);
    expect(service.getByCode('cantilan')?.status).toBe('Active');
    expect(service.getByCode('carmen')?.status).toBe(initialCarmenStatus);
  });

  it('stops resolving and uses the snapshot when the live registry stalls', async () => {
    vi.useFakeTimers();
    try {
      const service = TestBed.inject(MunicipalityService);
      const request = http.expectOne(`${API_BASE_URL}/api/municipalities`);

      expect(service.resolving()).toBe(true);
      const initialCarmenStatus = service.getByCode('carmen')?.status;

      await vi.advanceTimersByTimeAsync(8_000);

      expect(request.cancelled).toBe(true);
      expect(service.resolving()).toBe(false);
      expect(service.getByCode('carmen')?.status).toBe(initialCarmenStatus);
    } finally {
      vi.useRealTimers();
    }
  });
});
