import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { Municipality } from '../../core/municipality.model';
import { MunicipalityService } from '../../core/municipality.service';
import { MunicipalityRollout } from './municipality-rollout';

/**
 * "View Rollout Requirements" used to be a bare `href="#requirements"`. That moved the viewport and
 * nothing else: focus stayed on the button, and the fragment it left in the address bar was never
 * honoured on a reload because the section sits inside an @if block and is absent when the router
 * looks for it. These tests pin the replacement behaviour.
 */
describe('MunicipalityRollout — activation requirements link', () => {
  let scrollTo: ReturnType<typeof vi.fn>;
  let reduceMotion: boolean;
  let all: WritableSignal<readonly Municipality[]>;
  let resolving: WritableSignal<boolean>;

  function render(code = 'carmen') {
    TestBed.configureTestingModule({
      imports: [MunicipalityRollout],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ code }) } },
        },
        {
          provide: MunicipalityService,
          useValue: {
            all,
            resolving,
            getByCode: (requested: string | null | undefined) =>
              all().find((m) => m.code === requested?.trim().toLowerCase()),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(MunicipalityRollout);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    reduceMotion = false;
    scrollTo = vi.fn();
    all = signal<readonly Municipality[]>([
      {
        code: 'carmen',
        name: 'Carmen',
        status: 'Upcoming',
        image: '/carcanmadcarlan/backgrounds/carmen-reference.png',
      },
    ]);
    resolving = signal(false);

    vi.stubGlobal('scrollTo', scrollTo);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: reduceMotion })),
    );
    // The Reveal directive observes its host; jsdom has no IntersectionObserver.
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe(): void {
          /* never intersects in jsdom */
        }
        disconnect(): void {
          /* nothing to release */
        }
      },
    );

    window.history.replaceState(null, '', '/municipalities/carmen');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('renders the requirements section as a focus target', () => {
    const fixture = render();
    const section: HTMLElement | null = fixture.nativeElement.querySelector('#requirements');

    expect(section).toBeTruthy();
    expect(section?.getAttribute('tabindex')).toBe('-1');
  });

  it('scrolls to the section, moves focus into it, and records the fragment', () => {
    const fixture = render();
    const section: HTMLElement = fixture.nativeElement.querySelector('#requirements');
    document.body.appendChild(fixture.nativeElement);

    fixture.componentInstance.scrollToRequirements();

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
    expect(document.activeElement).toBe(section);
    expect(window.location.hash).toBe('#requirements');
  });

  it('does not smooth-scroll when the reader prefers reduced motion', () => {
    reduceMotion = true;
    const fixture = render();
    document.body.appendChild(fixture.nativeElement);

    fixture.componentInstance.scrollToRequirements();

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });

  it('prevents the browser default so the router URL is not left behind', () => {
    const fixture = render();
    const event = new MouseEvent('click', { cancelable: true });

    fixture.componentInstance.scrollToRequirements(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('shows an active implementation and portal action without an assessment action', () => {
    all.set([
      {
        code: 'carmen',
        name: 'Carmen',
        status: 'Active',
        active: true,
        href: 'https://console.stalltrack.site/login?lgu=carmen',
        image: '/carcanmadcarlan/backgrounds/carmen-reference.png',
      },
    ]);
    const fixture = render();
    const text = fixture.nativeElement.textContent;
    const portal: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a[href^="https://console.stalltrack.site"]');

    expect(text).toContain('Active Implementation');
    expect(text).toContain('Enter Portal');
    expect(text).not.toContain('Request LGU Assessment');
    expect(portal?.href).toBe('https://console.stalltrack.site/login?lgu=carmen');
  });

  it('keeps the assessment flow available for an upcoming municipality after resolution', () => {
    const fixture = render();

    expect(fixture.nativeElement.textContent).toContain('Pending LGU Assessment');
    expect(fixture.nativeElement.textContent).toContain('Request LGU Assessment');
    expect(fixture.nativeElement.querySelector('#requirements')).toBeTruthy();
  });

  it('does not flash the assessment action while live rollout state is resolving', () => {
    resolving.set(true);
    const fixture = render();

    expect(fixture.nativeElement.textContent).toContain('Checking rollout status');
    expect(fixture.nativeElement.textContent).not.toContain('Request LGU Assessment');
    expect(fixture.nativeElement.querySelector('#requirements')).toBeFalsy();
  });
});
