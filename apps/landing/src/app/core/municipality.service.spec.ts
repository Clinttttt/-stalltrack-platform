import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api.config';
import { MunicipalityService } from './municipality.service';

describe('MunicipalityService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
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
    expect(carmen?.href).toBe('https://console.stalltrack.site/login?lgu=carmen');
    expect(carmen?.image).toBe('/carcanmadcarlan/backgrounds/carmen-reference.png');
  });

  it('keeps the committed snapshot usable when the live registry request fails', async () => {
    const service = TestBed.inject(MunicipalityService);

    http.expectOne(`${API_BASE_URL}/api/municipalities`).flush('Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    await vi.waitFor(() => expect(service.resolving()).toBe(false));

    expect(service.all().length).toBeGreaterThan(0);
    expect(service.getByCode('cantilan')?.status).toBe('Active');
    expect(service.getByCode('carmen')?.status).toBe('Upcoming');
  });

  it('stops resolving and uses the snapshot when the live registry stalls', async () => {
    vi.useFakeTimers();
    try {
      const service = TestBed.inject(MunicipalityService);
      const request = http.expectOne(`${API_BASE_URL}/api/municipalities`);

      expect(service.resolving()).toBe(true);
      expect(service.getByCode('carmen')?.status).toBe('Upcoming');

      await vi.advanceTimersByTimeAsync(8_000);

      expect(request.cancelled).toBe(true);
      expect(service.resolving()).toBe(false);
      expect(service.getByCode('carmen')?.status).toBe('Upcoming');
    } finally {
      vi.useRealTimers();
    }
  });
});
