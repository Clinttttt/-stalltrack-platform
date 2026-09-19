import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Municipality } from '../../core/municipality.model';
import { MunicipalityService } from '../../core/municipality.service';
import { SelectMunicipality } from './select-municipality';

describe('SelectMunicipality', () => {
  it('links a municipality resolved as active to its scoped portal', () => {
    const all = signal<readonly Municipality[]>([
      {
        code: 'carmen',
        name: 'Carmen',
        status: 'Active',
        active: true,
        href: 'https://console.stalltrack.site/login?lgu=carmen',
        image: '/carcanmadcarlan/backgrounds/carmen-reference.png',
      },
    ]);

    TestBed.configureTestingModule({
      imports: [SelectMunicipality],
      providers: [
        provideRouter([]),
        { provide: MunicipalityService, useValue: { all } },
      ],
    });

    const fixture = TestBed.createComponent(SelectMunicipality);
    fixture.detectChanges();

    const portal: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      'a[aria-label="Open Carmen portal"]',
    );
    expect(portal?.href).toBe('https://console.stalltrack.site/login?lgu=carmen');
  });
});
