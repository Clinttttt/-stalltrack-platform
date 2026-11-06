import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BrandingService } from './branding.service';
import { API_BASE_URL } from './api.config';

describe('BrandingService seal', () => {
  async function sealFor(sealPath: string | null) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(BrandingService);
    const loading = service.ensureLoaded();
    TestBed.inject(HttpTestingController)
      .expectOne(`${API_BASE_URL}/api/municipalities/current/branding`)
      .flush({ code: 'X', tenantCode: 'x', name: 'X', province: 'X', officeName: 'X', sealPath, officeAcronym: null });
    await loading;
    return service.sealUrl();
  }

  it('shows an uploaded seal', async () => {
    expect(await sealFor('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('shows no seal for a path that lives on another host, rather than a broken image', async () => {
    expect(await sealFor('/images/stalltrack-seal.png')).toBeNull();
  });
});
